import { fs, log, selectors } from "vortex-api";
import path from "path";
import { MOD_FILE_EXT, GAME_ID } from ".";
import { IExtensionApi, IInstallResult, IInstruction, IState, ProgressDelegate } from "vortex-api/lib/types/api";
import { toAttributeInstructions } from "vortex-ext-common";
import * as nfs from 'fs';
import { IPakFile, PakFileReader } from "@agc93/pak-reader";
import { getAssets } from "./sfpaks";

export function testSupportedContent(files: string[], gameId: string) {
    // Make sure we're able to support this mod.
    log('debug', `testing ${files.length} mod files for unreal installer`, {files, targetGame: this.targetGameId});
    let supported = (gameId === GAME_ID) &&
        (
            files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT) !== undefined
        );

    return Promise.resolve({
        supported,
        requiredFiles: [],
    });
}

export class IncludedFilesExtender {
    private _api: IExtensionApi;
    /**
     *
     */
    constructor(api: IExtensionApi) {
        this._api = api;
        
    }

    extender = async (instructions: IInstruction[], files: string[], modName: string): Promise<IInstruction[]> => {
        var stagingPath = selectors.installPathForGame(this._api.getState(), GAME_ID);
        var attrs: IInstruction[] = [];
        if (stagingPath && stagingPath.length > 0) {
            var fullPath = path.join(stagingPath, `${modName}.installing`);
            var obj: {[fileName: string]: string[]} = {}
            var selectedPaks = instructions
                .filter(i => i.type == "copy" && path.extname(i.destination) == MOD_FILE_EXT)
                .map(i => {return {file: i.source, path: path.join(fullPath, i.source)}});
            for (const selectedPak of selectedPaks) {
                if (nfs.existsSync(selectedPak.path)) {
                    var reader = new PakFileReader(selectedPak.path, {safeMode: true});
                    var result = await reader.parse();
                    if (this.isValidPak(result)) {
                        obj[path.basename(selectedPak.file)] = getAssets(result)
                    }
                }
            }
            if (obj && Object.keys(obj).length > 0) {
                attrs = toAttributeInstructions({includedFiles: obj});
            }
        }
        return attrs;
    }

    private isValidPak = (file: IPakFile): boolean => {
        return file && file.archiveVersion === 3 && file.index && (file.index.recordCount ?? 0) > 0;
    }
}