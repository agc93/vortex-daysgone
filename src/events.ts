import { actions, fs, log, selectors, util } from "vortex-api";
import { IExtensionApi, INotification, INotificationAction, ITestResult } from "vortex-api/lib/types/api";
import { getDiscoveryPath } from "vortex-ext-common";
import { Deployment, IGameModTable } from "vortex-ext-common/events";
import { updateSfPakAssets } from "./store";
import { readSfpakAssets, SfpakCache } from "./sfpaks";
import { isSfpaksEnabled, ensureSfpaksDisabled, getEnabledMods, dbg_ensureSfpaksDisabled } from "./util";
import { GAME_ID } from ".";
import * as path from "path";

export const handleDeployment = async (api: IExtensionApi, profileId: string, deployment: Deployment): Promise<any> => {
    var knownAssets = util.getSafeCI<string[]>(api.getState(), ['settings', 'daysgone-assets', 'sfPaks'], []);
    var isEnabled = isSfpaksEnabled(api);
    if (isEnabled) {
        //sfpaks still enabled, check if we need to rename/disable it

    }
}

type IncludedFilesAttribute = { [fileName: string]: string[] };

export const testSfpakConflicts = async (api: IExtensionApi): Promise<ITestResult> => {
    var state = api.getState();
    var currGame = selectors.activeGameId(state);
    if (currGame !== GAME_ID) return;
    console.time("test:outer");

    var isEnabled = isSfpaksEnabled(api);
    if (!isEnabled) {
        // no point checking
        return undefined;
    }
    // var cacher = new SfpakCache(api);
    // var knownAssets = await cacher.getAssets();

    console.time("test:getCache");
    var knownAssets = util.getSafeCI<string[]>(state, ['settings', 'daysgone-assets', 'sfPaks'], []);
    var allMods = getEnabledMods(state, GAME_ID);
    console.timeEnd("test:getCache");
    //var allMods = Object.values(util.getSafe<IGameModTable>(state, ['persistent', 'mods', GAME_ID], {}));
    var conflictFound = false;
    console.time("test:outerLoop");
    for (const mod of allMods) {
        var files = util.getSafeCI<IncludedFilesAttribute>(mod.attributes, ['includedFiles'], {});
        if (Object.keys(files).length > 0) {
            var allFiles = Object.values(files).flat();
            console.time('test:innerLoop');
            if (allFiles.some(af => knownAssets.map(f => f.toLowerCase()).includes(af.toLowerCase()))) {
                console.timeEnd("test:innerLoop");
                conflictFound = true;
                break;
            }
            console.timeEnd("test:innerLoop");

        }
    }
    console.timeEnd("test:outerLoop");
    if (conflictFound) {
        return {
            severity: "error",
            description: {
                short: "Disabling sfpaks required",
                long: notifMessage,
            },
            automaticFix: automaticFix(api)
        }
    }
    return undefined;
}

export const refreshSfpakAssets = async (api: IExtensionApi, gameId: string, forceRefresh: boolean = false) => {
    var cacher = new SfpakCache(api);
    const notif = getNotification();
    log('info', 'Updating asset list and cache for sfpaks', { forceRefresh });
    notif.id = api.sendNotification(notif);
    console.time("refreshSfpakAssets");
    if (cacher.isReady && forceRefresh) {
        var assets = await cacher.updateCache();
    } else if (cacher.isReady && !forceRefresh) {
        var assets = await cacher.getAssets();
    }
    console.timeEnd("refreshSfpakAssets");
    /* if (allAssets.length > 0) {
        api.store.dispatch(updateSfPakAssets(allAssets));
    } */
    api.dismissNotification(notif.id);
}

const automaticFix = (api: IExtensionApi): () => Promise<void> => {
    return async () => {
        var state = api.getState();
        try {
            await ensureSfpaksDisabled(getDiscoveryPath(GAME_ID, state));
            return Promise.resolve();
        } catch (err) {
            var actions: INotificationAction[] = [];
            actions.push({
                title: 'More',
                action: (dismiss) => {
                    api.showDialog(
                        'error',
                        'Failed to auto-rename sfpaks folder',
                        {
                            htmlText: dialogHtmlMessage("Open Folder...")
                        },
                        [
                            { label: 'Close', default: false },
                            { label: 'Open Folder...', default: true, action: () => util.opn(getDiscoveryPath(GAME_ID, state, path.join('BendGame', 'Content'))) },
                        ]);
                }
            });
            actions.push({
                title: "Re-check",
                action: (dismiss) => {
                    api.events.emit('trigger-test-run', 'mod-activated');
                    dismiss();
                }
            })
            api.sendNotification({
                type: 'error',
                title: 'Failed to auto-rename sfpaks folder',
                message: err.code === 'EPERM'
                    ? 'Game files are write protected'
                    : err.message,
                actions,
                noDismiss: true,
                allowSuppress: false
            });
        }
    }
}



export const refreshSfpakAssetsState = async (api: IExtensionApi, gameId: string, forceRefresh: boolean = false) => {

    var discPath = getDiscoveryPath(gameId, api.getState());
    var allAssets = [];
    var existing = util.getSafeCI<string[]>(api.getState(), ['settings', 'daysgone-assets', 'sfPaks'], []);
    if (forceRefresh || !existing || !(existing.length > 0)) {
        const notif = getNotification();
        const progress = (percent: number, text: string) => {
            api.store.dispatch(actions.updateNotification(notif.id, percent, text));
        };

        log('info', 'Updating asset list for sfpaks', { forceRefresh, existing: existing?.length ?? 0 });
        if (discPath != null) {
            notif.id = api.sendNotification(notif);
            console.time("refreshSfpakAssets:state");
            var sfpakAssets = await readSfpakAssets(discPath);
            allAssets.push(...sfpakAssets);
            console.timeEnd("refreshSfpakAssets:state");
        }
        if (allAssets.length > 0) {
            log('debug', 'assets read from sfpaks, updating state', { count: allAssets.length })
            api.store.dispatch(updateSfPakAssets(allAssets));
        } else {
            log('warn', 'could not read asset list, skipping state update!');
        }
        api.dismissNotification(notif.id);
    }
}

function getNotification(): INotification {
    return {
        type: 'activity',
        message: 'Parsing vanilla game assets for conflicts',
        title: 'Updating game files cache'
    }
}

const baseMessage = "At least one of your installed mods replaces an optimised vanilla game asset, and will not be loaded unless we disable (rename) a vanilla game directory.<br /><br />This may increase loading times, but is required for some of your mods to function."
const notifMessage = baseMessage + "<br /><br />" + "Vortex can attempt to automatically fix this for you and will walk you through the process if there are any issues.";
const dialogHtmlMessage = (actionName: string): string => baseMessage + "<br /><br />" + "Vortex attempted to automatically rename your 'sfpaks' folder, but your game files are protected. You will need to manually fix this by following the steps below: <br />" +
    `<ul><li>Open your install's \"BendGame/Content\" folder using the '${actionName}' button below.</li><li>Rename the <code>sfpaks</code> folder to something else (like <code>0_sfpaks</code>).</li></ul>`;