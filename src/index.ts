import { fs, log, util } from "vortex-api";
import { IDiscoveryResult, IExtensionContext, IGameStoreEntry } from 'vortex-api/lib/types/api';
import path from "path";
import { UserPaths } from "./util";
import { EventHandler } from "vortex-ext-common/events";
import { addInstalledPaksAttribute, AdvancedInstallerBuilder } from "vortex-ext-common/install/advanced";
import { LoadOrderHelper } from "vortex-ext-common/ueLoadOrder";
import { IncludedFilesExtender } from "./install";
import { assetsReducer } from "./store";
import { refreshSfpakAssets, handleDeployment, testSfpakConflicts, refreshSfpakAssetsState } from "./events";

export const GAME_ID = 'daysgone';
export const MOD_FILE_EXT = ".pak";
const STEAMAPP_ID = 1259420;
const EXE_PATH = path.join('BendGame', 'Binaries', 'Win64', 'DaysGone.exe');

//This is the main function Vortex will run when detecting the game extension. 
function main(context: IExtensionContext) {
    var ext = new IncludedFilesExtender(context.api);
    var installer = new AdvancedInstallerBuilder(GAME_ID, MOD_FILE_EXT)
        .addExtender(addInstalledPaksAttribute(MOD_FILE_EXT))
        .addExtender(ext.extender)
        .build();
    var lo = new LoadOrderHelper(context.api, GAME_ID)
        .withFilter((val, mod) => {
            return mod ? mod.type == '' : false; //only include default mod types
        });
    var evt = new EventHandler(context.api, GAME_ID);
    context.once(() => {
        log('debug', 'initialising your new extension!')
        installer.configure(context.api);
        //evt.gameModeActivated(async (id) => await refreshSfpakAssets(context.api, id));
        evt.gameModeActivated(async (id) => await refreshSfpakAssetsState(context.api, id));
        evt.didDeploy(async (profileId, deployment) => await handleDeployment(context.api, profileId, deployment))
    });
    context.registerReducer(['settings', 'daysgone-assets'], assetsReducer);
    context.registerTest('daysgone-sfpaks-enable', 'mod-activated', () => testSfpakConflicts(context.api))
    //context.registerTest('daysgone-sfpaks-start', 'profile-did-change', () => testSfpakConflicts(context.api))
    context.registerTest('daysgone-sfpaks-activate', 'gamemode-activated', () => testSfpakConflicts(context.api))
    context.registerGame({
        name: "Days Gone",
        mergeMods: lo.createPrefix,
        logo: 'gameart.png',
        executable: () => EXE_PATH,
        requiredFiles: [
            EXE_PATH
        ],
        id: GAME_ID,
        queryPath: findGame,
        queryModPath: findModPath,
        setup,
        environment: {
            SteamAPPId: STEAMAPP_ID.toString()
        },
        details: {
            steamAppId: STEAMAPP_ID,
            appDataPath: () => UserPaths.userDataPath(),
            settingsPath: () => UserPaths.userConfigPath()
        }
    });
    context.registerInstaller(
        'dg-pakmods-adv',
        25,
        installer.testSupported,
        installer.advancedInstall
    );
    context.registerLoadOrder({
        deserializeLoadOrder: lo.deserialize,
        serializeLoadOrder: lo.serialize,
        gameId: GAME_ID,
        validate: lo.validate,
        toggleableEntries: false
    });
    return true;
}

async function setup(discovery: IDiscoveryResult): Promise<void> {
    await fs.ensureDirWritableAsync(UserPaths.paksPath());
    return fs.ensureDirWritableAsync(UserPaths.installPaksPath(discovery.path))
}

function findModPath(gamePath: string): string {
    return UserPaths.installPaksPath(gamePath);
}

async function findGame(): Promise<string> {
    var entry: IGameStoreEntry = await util.GameStoreHelper.findByAppId(STEAMAPP_ID.toString())
    return entry.gamePath;
}



module.exports = {
    default: main,
};