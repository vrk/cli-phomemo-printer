// Read the battery level of the first found peripheral exposing the Battery Level characteristic

const noble = require('@abandonware/noble');

noble.startScanningAsync([], true); // any service UUID, allow duplicates

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
        service.once('characteristicsDiscover', (characteristic) => {
          console.log(characteristic);
          // characteristic.write();
        });

      }
    })
    await p.connectAsync();
    console.log('hihi')
    const {characteristics} = await p.discoverAllServicesAndCharacteristicsAsync();
    console.log("hiii", characteristics);
  }
});

