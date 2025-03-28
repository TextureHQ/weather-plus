import { ICloudLayer } from "./interfaces";

export function getCloudinessFromCloudLayers(cloudLayers: Array<ICloudLayer>): number {
    if (!cloudLayers || cloudLayers.length === 0) {
        return 0;
    }

    const cloudinessSum = cloudLayers.reduce((acc, cloudLayer) => {
        return acc + cloudCodeToPercent(cloudLayer.amount);
    }, 0);

    // return the average of the cloudiness values across all cloud layers
    return Math.round(cloudinessSum / cloudLayers.length);
}


// http://www.moratech.com/aviation/metar-class/metar-pg10-sky.html
// OVC, BKN, SCT, FEW, SKC, CLR, VV
function cloudCodeToPercent(code: string): number {
    switch (code) {
      case "CLR":
      case "SKC":
        return 0;
      case "FEW":
        return 20;
      case "SCT":
        return 40;
      case "BKN":
        return 75;
      case "OVC":
      case "VV": // sky obscured – assume fully covered
        return 100;
      default:
        return 0;
    }
  }
  