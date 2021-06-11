import * as path from "path";
import * as nfs from "fs";
import { GAME_ID, MOD_FILE_EXT } from ".";
import { getFiles } from "./util";
import { IPakFile, PakFileReader } from "@agc93/pak-reader";
import { IExtensionApi, ProgressDelegate } from "vortex-api/lib/types/api";
import { fs, log } from "vortex-api";
import { getDiscoveryPath } from "vortex-ext-common";

/**
 * @deprecated
 */
export class SfpakCache {
    private _api: IExtensionApi;
    /**
     *
     */
    constructor(api: IExtensionApi) {
        this._api = api;
        
    }

    
    public get isReady() : boolean {
        return this._api != null && this.getCacheFilePath() != null;
    }
    

    getAssets = async(): Promise<string[]> => {
        var cache = this.getCache();
        if (cache && cache.length > 0) {
            return cache;
        } else {
            var assets = await this.updateCache();
            return assets;
        }
    }

    getCache = (): string[] => {
        var cachePath = this.getCacheFilePath();
        if (nfs.existsSync(cachePath)) {
            var parse = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            return parse?.assets ?? [];
        }
    }

    updateCache = async (): Promise<string[]> => {
        var discPath = getDiscoveryPath(GAME_ID, this._api.getState());
        var assets = await readSfpakAssets(discPath);
        if (assets && assets.length > 0) {
            await fs.writeFileAsync(this.getCacheFilePath(), JSON.stringify({updated: Date.now(), assets}));
        }
        return assets;
    }

    private getCacheFilePath = (): string => {
        var discPath = getDiscoveryPath(GAME_ID, this._api.getState());
        var contentPath = path.join(discPath, 'BendGame', 'Content');
        return path.join(contentPath, 'sfpaks.json');
    }


}


export const readSfpakAssets = async (discoveryPath: string, progress?: ProgressDelegate): Promise<string[]> => {
    var allAssets: string[] = [];
    var contentPath = path.join(discoveryPath, 'BendGame', 'Content');
    var sfPaksPath = path.join(contentPath, 'sfpaks');
    if (nfs.existsSync(sfPaksPath)) {
        for await (const f of getFiles(sfPaksPath)) {
            if (path.extname(f) == MOD_FILE_EXT) {
                // debugger;
                var rdr = new PakFileReader(f, { safeMode: true });
                var parsed = await rdr.parse();
                var assets = getAssets(parsed);
                allAssets.push(...new Set(assets));
            }
        }
    }
    return [...new Set(allAssets)];
}

export function getAssets(results: IPakFile): string[] {
    var assets = [];
    var mountSegs = results.index.mountPoint.split(/[/\\]/).filter(s => /[a-z0-9]+/i.test(s));
    if (results && (results.index?.recordCount ?? 0) > 0) {
        for (const record of results.index.records) {
            assets.push(mountSegs.length > 0 ? `${mountSegs.join('/')}/${record.fileName}` : record.fileName);
        }
        /* 
        var records = mountSegs.length > 0
            ? results.index.records.map(r => )
            : results.index.records.map(r => r.fileName);
        assets.push(...records); */
    }
    return assets;
}