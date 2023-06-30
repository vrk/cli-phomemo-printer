const noble = require('@abandonware/noble');
const Jimp = require("jimp");
const fs = require('fs')
const floydSteinberg = require('floyd-steinberg');
const PNG = require('pngjs').PNG;

//////////////////////////////////////////////
// Main
//////////////////////////////////////////////

const BYTES_PER_LINE = 60;

const discovered = {};

function scanDevices() {

}
noble.startScanningAsync();
noble.on('discover', async (peripheral) => {
  const { localName } = peripheral.advertisement;
  if (localName === undefined || localName.trim().length === 0) {
    return;
  }
  if (!discovered[localName]) {
    console.log(localName);
  }
  discovered[localName] = peripheral;
  // if (localName == 'M02S') {
  //   console.log('here')
  //   await noble.stopScanningAsync();
  //   p.on('connect', () => {
  //     console.log("it's me vrk");
  //   })
  //   p.on("disconnect", () => {
  //     console.log("it's me vrk 2");
  //   })
  //   p.on("servicesDiscover", async (services) => {
  //     console.log("it's me vrk 3", services.length);
  //     for (const service of services) {
  //       service.discoverCharacteristics(); // any characteristic UUI
  //       service.once('characteristicsDiscover', async (characteristics) => {
  //         for (const characterstic of characteristics) {
  //           if (!characterstic.properties.includes('write')) {
  //             continue;
  //           }
  //           console.log(characterstic.properties);
  //           const data = await getPrintDataFromPort();

  //           characterstic.write(Buffer.from(data), true);
  //         }
  //       });

  //     }
  //   })
  //   await p.connectAsync();
  //   console.log('hihi')
  //   const {characteristics} = await p.discoverAllServicesAndCharacteristicsAsync();
  //   console.log("hiii", characteristics);
  // }
});


let line = 0;
let remaining = 480;

async function getPrintDataFromPort() {
  // await getImageDataBurger()
  // return;
  const pic = (await Jimp.read("burger2.png"))
  let printData = [];
  // return printData;
  // const uint8DataArray = new Uint8Array(printData);
  // return uint8DataArray;

  // ********
  // FROM https://github.com/vivier/phomemo-tools/tree/master#31-header
  // PRINTING HEADER

  // Initialize printer
  printData[0] = 27;  
  printData[1] = 64;

  // Select justification
  printData[2] = 27; 
  printData[3] = 97; 

  // Justify (0=left, 1=center, 2=right)
  printData[4] = 1; 

  // End of header
  printData[5] = 31; 
  printData[6] = 17; 
  printData[7] = 2; 
  printData[8] = 4;
  // ********

  let index = 9;
  while (remaining > 0) {
    let lines = remaining
    if (lines > 256) {
      lines = 256;
    }
    // ********
    // FROM https://github.com/vivier/phomemo-tools/tree/master#31-header
    // PRINTING MARKER

    // 0x761d.to_bytes(2, 'little') -> b'\x1dv'.hex() -> 1d76

    printData[index++] = 29
    printData[index++] = 118

    // stdout.write(0x0030.to_bytes(2, 'little'))
    printData[index++] = 48
    printData[index++] = 0

    printData[index++] = 60 // 60 bytes per line
    printData[index++] = 0
  
    printData[index++] = lines - 1
    console.log("lines is", lines);
    printData[index++] = 0
    // ********

    remaining -= lines;
    console.log("remaining", remaining);

    while (lines > 0) {
      // ******
      // PRINT LINE

      // Each bit represents whether we're printing a pixel or not (1 = yes, print black; 0 = no, print nothing)
      // Therefore we need to go width / 8

      for (let x = 0; x < BYTES_PER_LINE; x++) {
        // Everything just black for now
        // if (i % 2 === 0) {
        //   printData[index] = 255;
        // } else {
        //   printData[index] = 255;
        // }
        // printData[index] = burgerData[i * 4];

        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const rgba = Jimp.intToRGBA(pic.getPixelColor(x * 8 + bit, line));
          if (rgba.r === 0 && rgba.a !== 0) {
            byte |= 1 << (7 - bit)
          }
        }
        if (byte === 0x0a) {
          byte = 0x14;
        }
        printData[index] = byte;
        index++;
      }
      // ******
      lines--;
      line++;
    }
  }



  // ******
  // PRINT FOOTER
  printData[index++] = 27;
  printData[index++] = 100;
  printData[index++] = 2;

  printData[index++] = 27;
  printData[index++] = 100;
  printData[index++] = 2;

  // b'\x1f\x11\x08'
  printData[index++] = 31;
  printData[index++] = 17;
  printData[index++] = 8;
  // \x1f\x11\x0e
  printData[index++] = 31;
  printData[index++] = 17;
  printData[index++] = 14;

  // x1f\x11\x07
  printData[index++] = 31;
  printData[index++] = 17;
  printData[index++] = 7;

  // b'\x1f\x11\x09'
  printData[index++] = 31;
  printData[index++] = 17;
  printData[index++] = 9;


  // const uint8DataArray = new Uint8Array(printData);
  // return uint8DataArray;
  return printData;
}







async function getImageData() {
  let grayscaleData = [];
  console.log('here');
  // pic = pic.resize(IMAGE_WIDTH, Jimp.AUTO)
  // await pic.writeAsync("burger3.png");
  // pic = await Jimp.read("burger3.png");
  console.log("VRK HERE", pic.bitmap.width, pic.bitmap.height)
  for (let x = 0; x < pic.bitmap.width; x++) {
    for (let y = 0; y < pic.bitmap.height; y++) {
    // for (let y = pic.bitmap.height / 2; y < pic.bitmap.height / 2 + 1; y++) {
      const rgba = Jimp.intToRGBA(pic.getPixelColor(x, y));
      if (rgba.r === 0 && rgba.a !== 0) {
        grayscaleData.push(0)
      } else {
        grayscaleData.push(1)
      }
    }
  }
  
  return grayscaleData;
}


async function getImageDataBurger() {
  return new Promise((resolve) => {
    fs.createReadStream('burger.png').pipe(new PNG()).on('parsed', function() {
      floydSteinberg(this).pack().pipe(fs.createWriteStream('burger2.png'));
      resolve();
    });
  });
}
