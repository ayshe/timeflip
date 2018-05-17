import noble from "noble";
import express from "express";
import bodyParser from "body-parser";
import template from "./templates/main";

const app = express();
const TIMEFLIP = 'ffff544676332e3100';
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send(template)
});

const discover = function (peripheral) {
    if (peripheral.advertisement.manufacturerData) {
        if (peripheral.advertisement.manufacturerData.toString('hex') == TIMEFLIP) {
            console.log('\there is my manufacturer data:');
            console.log('\t\t' + JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex')));
            console.log('peripheral discovered (' + peripheral.id +
                ' with address <' + peripheral.address + ', ' + peripheral.addressType + '>,' +
                ' connectable ' + peripheral.connectable + ',' +
                ' RSSI ' + peripheral.rssi + ':');

            console.log('\thello my local name is:');
            console.log('\t\t' + peripheral.advertisement.localName);
            console.log('\tcan I interest you in any of the following advertised services:');
            console.log('\t\t' + JSON.stringify(peripheral.advertisement.serviceUuids));
            var serviceData = peripheral.advertisement.serviceData;
            if (serviceData && serviceData.length) {
                console.log('\there is my service data:');
                for (var i in serviceData) {
                    console.log('\t\t' + JSON.stringify(serviceData[i].uuid) + ': ' + JSON.stringify(serviceData[i].data.toString('hex')));
                }
            }
            if (peripheral.advertisement.txPowerLevel !== undefined) {
                console.log('\tmy TX power level is:');
                console.log('\t\t' + peripheral.advertisement.txPowerLevel);
            }
            console.log();
        }
    }

};

app.listen(3020, function () {
    console.log('Visualiser listening on port 3020');
    noble.on('stateChange', function (state) {
        if (state === 'poweredOn') {
            noble.startScanning();
        } else {
            noble.stopScanning();
        }
    });
    noble.on('discover', discover);
});