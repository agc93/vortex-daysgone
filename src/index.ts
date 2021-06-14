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
    var evt = new EventHandler(context.api, GAME_ID);
    context.requireExtension("Days Gone - Vortex Extension");
    context.once(() => {
        installer.configure(context.api);
        //evt.gameModeActivated(async (id) => await refreshSfpakAssets(context.api, id));
        evt.gameModeActivated(async (id) => await refreshSfpakAssetsState(context.api, id));
        evt.didDeploy(async (profileId, deployment) => await handleDeployment(context.api, profileId, deployment))
    });
    context.registerReducer(['settings', 'daysgone-assets'], assetsReducer);
    context.registerTest('daysgone-sfpaks-enable', 'mod-activated', () => testSfpakConflicts(context.api))
    //context.registerTest('daysgone-sfpaks-start', 'profile-did-change', () => testSfpakConflicts(context.api))
    context.registerTest('daysgone-sfpaks-activate', 'gamemode-activated', () => testSfpakConflicts(context.api))
    context.registerInstaller(
        'dg-pakmods-adv',
        25,
        installer.testSupported,
        installer.advancedInstall
    );
    return true;
}


module.exports = {
    default: main,
};