// Read the battery level of the first found peripheral exposing the Battery Level characteristic

const noble = require('@abandonware/noble');
const { Printer, InMemory } = require('escpos-buffer');


noble.startScanningAsync([], true); // any service UUID, allow duplicates

const canvas = {
  width: 20,
  height: 100,
}

function getDarkPixel(x, y) {
  let isDark = true;
  if (isDark) {
    return 1;
  } else {
    return 0;
  }
}

function getImagePrintData() {
  // Each 8 pixels in a row is represented by a byte
  let printData = new Uint8Array(canvas.width / 8 * canvas.height + 8);
  let offset = 0;
  // Set the header bytes for printing the image
  printData[0] = 29;  // Print raster bitmap
  printData[1] = 118; // Print raster bitmap
  printData[2] = 48; // Print raster bitmap
  printData[3] = 0;  // Normal 203.2 DPI
  printData[4] = canvas.width / 8; // Number of horizontal data bits (LSB)
  printData[5] = 0; // Number of horizontal data bits (MSB)
  printData[6] = canvas.height % 256; // Number of vertical data bits (LSB)
  printData[7] = canvas.height / 256;  // Number of vertical data bits (MSB)
  offset = 7;
  // Loop through image rows in bytes
  for (let i = 0; i < canvas.height; ++i) {
    for (let k = 0; k < canvas.width / 8; ++k) {
      let k8 = k * 8;
      //  Pixel to bit position mapping
      printData[++offset] = getDarkPixel(k8 + 0, i) * 128 + getDarkPixel(k8 + 1, i) * 64 +
                  getDarkPixel(k8 + 2, i) * 32 + getDarkPixel(k8 + 3, i) * 16 +
                  getDarkPixel(k8 + 4, i) * 8 + getDarkPixel(k8 + 5, i) * 4 +
                  getDarkPixel(k8 + 6, i) * 2 + getDarkPixel(k8 + 7, i);
    }
  }
  return printData;
}



noble.on('discover', async (p) => {

  if (p.advertisement.localName == 'M02S') {
    console.log('here')
    await noble.stopScanningAsync();
    p.on('connect', () => {
      console.log("it's me vrk");
    })
    p.on("disconnect", () => {
      console.log("it's me vrk 2");
    })
    p.on("servicesDiscover", (services) => {
      console.log("it's me vrk 3", services.length);
      for (const service of services) {
        service.discoverCharacteristics(); // any characteristic UUI
        service.once('characteristicsDiscover', async (characteristics) => {
          for (const characterstic of characteristics) {
            if (!characterstic.properties.includes('write')) {
              continue;
            }
            console.log(characterstic.properties);
            const data = getImagePrintData();
            let encoder = new TextEncoder("utf-8");
            // Add line feed + carriage return chars to text
            let text = encoder.encode("this is a test" + '\u000A\u000D');  

            characterstic.write(Buffer.from(data), true);
            characterstic.write(Buffer.from(text));
          }
        });

      }
    })
    await p.connectAsync();
    console.log('hihi')
    const {characteristics} = await p.discoverAllServicesAndCharacteristicsAsync();
    console.log("hiii", characteristics);
  }
});

