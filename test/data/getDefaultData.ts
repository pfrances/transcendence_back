import * as fs from 'fs';

const testDataFilename = 'test/data/testData.json';

export function writeJsonData(data: unknown): void {
  fs.writeFileSync(testDataFilename, JSON.stringify(data));
}

export function getJsonData(): unknown {
  const rawData = fs.readFileSync(testDataFilename, 'utf8');
  return JSON.parse(rawData);
}
