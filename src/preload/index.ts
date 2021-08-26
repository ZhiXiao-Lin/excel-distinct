import { contextBridge } from 'electron';
import * as fs from 'fs';
import { promisify } from 'util';
import { CTX } from '../constants';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const api: any = {
  versions: process.versions,
  readFile: async (path: string) => {
    return await readFileAsync(path);
  },
  writeFile: async (path: string, buffer: Buffer) => {
    return await writeFileAsync(path, buffer);
  },
};

contextBridge.exposeInMainWorld(CTX, api);
