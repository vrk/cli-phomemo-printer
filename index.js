import noble from '@abandonware/noble';
import spinner from 'cli-spinner';
import { Command } from 'commander';
import floydSteinberg from 'floyd-steinberg';
import { createReadStream, createWriteStream } from 'fs';
import * as path from 'path';
import { select, confirm } from '@inquirer/prompts';
import Jimp from "jimp";
import { PNG } from 'pngjs';

const { Spinner } = spinner;

const BYTES_PER_LINE = 69; // TODO: Make this configurable
const IMAGE_WIDTH = BYTES_PER_LINE * 8;

const SCAN_AGAIN_SELECTION = "__scan_again__";
const QUIT_SELECTION = "__quit__";

let discoveredDevices = {};

//////////////////////////////////////////////
// main
//////////////////////////////////////////////

const program = new Command();
program
  .option('-f, --file <path>', 'path for image to print', './burger.png')
  .option('-s, --scale <size>', 'percent scale at which the image should print (1-100)', 100);
program.parse(process.argv);
const { file, scale } = program.opts()

if (file, scale) {
  const printableImgPath = await makeDitheredImage(file, scale);


  printerMenu(printableImgPath);
}

//////////////////////////////////////////////
// functions
//////////////////////////////////////////////

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function printerMenu(printableImgPath) {
  let scanDurationInMs = 5000;
  do {
    await scanDevices(scanDurationInMs);
    const choice = await selectDevice();

    if (choice === SCAN_AGAIN_SELECTION) {
      scanDurationInMs = 10000; // Try a longer duration the second time
      scanDevices();
    } else if (choice == QUIT_SELECTION) {
      process.exit();
    } else {

      // Let's see if we can write to this device.
      let peripheral = discoveredDevices[choice];
      const characteristic = await getWritableCharacteristic(peripheral);

      // Looks like we can't write to this device.
      if (!characteristic) {
        const tryAgain = await promptTryAgain()
        if (tryAgain) {
          continue;
        } else {
          process.exit();
        }
      }

      // We *can* write to this device, so let's ask for an image now.
      const data = await getPrintDataFromPort(printableImgPath);
      characteristic.write(Buffer.from(data), true);
      await delay(10000);
      process.exit();
    }
  } while (true);
}

async function scanDevices(scanDurationInMs=5000) {
  discoveredDevices = {};

  const spinner = new Spinner('scanning bluetooth devices.. %s');
  spinner.setSpinnerString('|/-\\');
  spinner.start();
  noble.on('discover', async (peripheral) => {
    const { localName } = peripheral.advertisement;
    if (localName === undefined || localName.trim().length === 0) {
      return;
    }
    discoveredDevices[localName] = peripheral;
  });
  noble.startScanningAsync();

  await delay(scanDurationInMs);

  await noble.stopScanningAsync();
  spinner.stop(true);
}

async function selectDevice() {
  const choices = [];
  for (const key in discoveredDevices) {
    choices.push({
      value: key
    });
  }
  choices.push({
    name: "- Scan again",
    value: SCAN_AGAIN_SELECTION
  });

  choices.push({
    name: "- Quit",
    value: QUIT_SELECTION
  });

  const prompt = {
    message: "Select your bluetooth printer",
    choices,
    pageSize: 12
  }
  return select(prompt);
}

async function getWritableCharacteristic(peripheral) {
  await peripheral.connectAsync();
  const { characteristics } = await peripheral.discoverAllServicesAndCharacteristicsAsync();
  const [characteristic] = characteristics.filter(characteristic => { 
    return characteristic.properties.includes('write');
  })
  return characteristic;
}

async function promptTryAgain() {
  console.log("dang it doesn't look like we can print to this device 😕")
  return confirm({ message: 'want to try again?' });
}

let line = 0;

async function getPrintDataFromPort(printableImgPath) {
  // await getImageDataBurger()
  // return;
  const pic = await Jimp.read(printableImgPath)
  let remaining = pic.bitmap.height;
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
  printData[4] = 0; 

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

    printData[index++] = BYTES_PER_LINE
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



async function makeDitheredImage(imgPath, scale) {
  let originalFileName = path.basename('path');
  if (!originalFileName) {
    throw new Error();
  }
  let pic = await Jimp.read(imgPath);
  const scalePercentage = Math.min(Math.max(scale / 100.0, 0.0), 1.0); 
  const scaledWidth = Math.floor(scalePercentage * IMAGE_WIDTH);

  // Scale the given image to the desired size.
  const resizedImgPath = `${imgPath}--resized.png`;
  pic = pic.resize(scaledWidth, Jimp.AUTO)

  // Scale a transparent background to the width expected by the printer, and the height
  // of the scaled image.
  let transparentBackground = await Jimp.read('./transparent-square.png');
  transparentBackground = transparentBackground.resize(IMAGE_WIDTH, pic.bitmap.height);
  const x = IMAGE_WIDTH - pic.bitmap.width;
  const composedPic = transparentBackground.composite(pic, x, 0);  

  await composedPic.writeAsync(resizedImgPath);
  return convertToDithered(resizedImgPath);
}

async function convertToDithered(resizedImgPath) {
  const ditheredImgPath = `${resizedImgPath}--dithered.png`;
  return new Promise((resolve) => {
    createReadStream(resizedImgPath).pipe(new PNG()).on('parsed', function() {
      floydSteinberg(this).pack().pipe(createWriteStream(ditheredImgPath));
      resolve(ditheredImgPath);
    });
  });
}

