import { remote, app } from "electron";
import { fs, selectors, util } from "vortex-api";
import * as nfs from 'fs';
import { promises as pfs } from 'fs';
import path from "path";
import { IExtensionApi, IMod, IProfileMod, IState } from "vortex-api/lib/types/api";
import { getDiscoveryPath } from "vortex-ext-common";
import { GAME_ID } from ".";


export function getPathFn() {
    return (remote?.app ?? app).getPath;
}

export const UserPaths = {
    userDataPath: (): string => path.join(getPathFn()("home"), 'AppData', 'Local', 'BendGame', 'Saved'),
    paksPath: (): string => path.join(UserPaths.userDataPath(), 'Paks'),
    installPaksPath: (gamePath: string): string => path.join(gamePath, "BendGame", "Content", "Paks", "~mods"),
    saveGamesPath: (): string => getSaveGamePath(),
    userConfigPath: (): string => path.join(UserPaths.userDataPath(), "Config", "WindowsNoEditor")
}

export function isSfpaksEnabled(api: IExtensionApi) {
    var discPath = getDiscoveryPath(GAME_ID, api.getState());
    var prefix = path.join(discPath, 'BendGame', 'Content');
    var orig = path.join(prefix, 'sfpaks');
    return nfs.existsSync(orig);
}

export async function ensureSfpaksDisabled(gamePath: string): Promise<boolean> {
    var prefix = path.join(gamePath, 'BendGame', 'Content');
    var orig = path.join(prefix, 'sfpaks');
    var disabled = path.join(prefix, '0_sfpaks');
    if (nfs.existsSync(orig) && !nfs.existsSync(disabled)) {
        await pfs.rename(orig, disabled);
        //await fs.renameAsync(orig, disabled);
    }
    return !nfs.existsSync(orig);
}

export async function dbg_ensureSfpaksDisabled(gamePath: string): Promise<boolean> {
    debugger;
    var prefix = path.join(gamePath, 'BendGame', 'Content');
    var orig = path.join(prefix, 'sfpaks');
    var disabled = path.join(prefix, '0_sfpaks');
    if (nfs.existsSync(orig) && !nfs.existsSync(disabled)) {
        try {
            await pfs.rename(orig, disabled);
        } catch (error) {
            debugger;
            console.error(error)
        }

        //await fs.renameAsync(orig, disabled);
    }
    return !nfs.existsSync(orig);
}

async function ensureSfpaksEnabled(gamePath: string): Promise<boolean> {
    var prefix = path.join(gamePath, 'BendGame', 'Content');
    var enabled = path.join(prefix, 'sfpaks');
    var disabled = path.join(prefix, '0_sfpaks');
    if (nfs.existsSync(disabled) && !nfs.existsSync(enabled)) {
        await fs.renameAsync(enabled, disabled);
    }
    return !nfs.existsSync(disabled);
}

export async function* getFiles(dir: string) {
    var dirents = await pfs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            yield* getFiles(res);
        } else {
            yield res;
        }
    }
}

export function getEnabledMods(state: IState, gameId: string, profileId?: string) {
    var mods = util.getSafe<{ [modId: string]: IMod; }>(state.persistent, ['mods', gameId], {});
    var profile = profileId ? selectors.profileById(profileId) : selectors.activeProfile(state);
    var profileMods: { [modId: string]: IProfileMod } = util.getSafe(profile, ['modState'], {});
    var enabledMods = Object.keys(profileMods).filter(pm => profileMods[pm].enabled).map(epm => mods[epm]);
    return enabledMods;
}

function getSaveGamePath() {
	var userDataDir = UserPaths.userDataPath();
    var dirents = nfs.readdirSync(userDataDir, { withFileTypes: true });
    var save = dirents.filter(d => d.isDirectory()).filter(n => /[0-9]/i.test(path.basename(n.name)));
    if (save && save.length > 0) {
        return path.join(save[0].name, "SaveGames)");
    }
    return userDataDir;
}