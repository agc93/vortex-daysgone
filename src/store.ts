import { createAction } from "redux-act";
import { util } from "vortex-api";
import { IReducerSpec, IState } from 'vortex-api/lib/types/api';
import { mergeStateArray } from "vortex-ext-common";

export const updateSfPakAssets = 
    createAction('DG_UPDATE_SFPAK_ASSETS', (files: string[]) => files);

export const assetsReducer: IReducerSpec = {
    reducers: {
        [updateSfPakAssets as any]: (state, payload: string[]) => {
            return util.setSafe(state, ['sfpaks'], payload);
        }
    },
    defaults: {
        'sfpaks': []
    }
}