import noble from "noble";
import async from "async";
import express from "express";
import bodyParser from "body-parser";
import template from "./templates/main";

const app = express();
const TIMEFLIP = 'ffff544676332e3100';
const FACET = 'f1196f5471a411e6bdf40800200c9a66';
const BATTERY = '2a19';
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send(template)
});

const connect = function (peripheral) {
    peripheral.connect(function (error) {
        peripheral.discoverServices([], function (error, services) {
            var serviceIndex = 0;

            async.whilst(
                function () {
                    return (serviceIndex < services.length);
                },
                function (callback) {
                    var service = services[serviceIndex];
                    var serviceInfo = service.uuid;

                    if (service.name) {
                        serviceInfo += ' (' + service.name + ')';
                    }
                    console.log(serviceInfo);

                    service.discoverCharacteristics([], function (error, characteristics) {
                        var characteristicIndex = 0;

                        async.whilst(
                            function () {
                                return (characteristicIndex < characteristics.length);
                            },
                            function (callback) {
                                var characteristic = characteristics[characteristicIndex];
                                var characteristicInfo = '  ' + characteristic.uuid;
                                if (characteristic.uuid == BATTERY) {
                                    console.log('BATT');
                                }
                                if (characteristic.uuid == FACET) {
                                    console.log('FACET');
                                }
                                if (characteristic.name) {
                                    characteristicInfo += ' (' + characteristic.name + ')';
                                }

                                async.series([
                                    function (callback) {
                                        characteristic.discoverDescriptors(function (error, descriptors) {
                                            async.detect(
                                                descriptors,
                                                function (descriptor, callback) {
                                                    if (descriptor.uuid === '2901') {
                                                        return callback(descriptor);
                                                    } else {
                                                        return callback();
                                                    }
                                                },
                                                function (userDescriptionDescriptor) {
                                                    if (userDescriptionDescriptor) {
                                                        userDescriptionDescriptor.readValue(function (error, data) {
                                                            if (data) {
                                                                characteristicInfo += ' (' + data.toString() + ')';
                                                            }
                                                            callback();
                                                        });
                                                    } else {
                                                        callback();
                                                    }
                                                }
                                            );
                                        });
                                    },
                                    function (callback) {
                                        characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');

                                        if (characteristic.properties.indexOf('read') !== -1) {
                                            characteristic.read(function (error, data) {
                                                if (data) {
                                                    var string = data.toString('ascii');

                                                    characteristicInfo += '\n    value       ' + (characteristic.uuid == BATTERY ? parseInt(data.toString('hex'), 16) + '%' : data.toString('hex')) + ' | \'' + string + '\'';
                                                }
                                                callback();
                                            });
                                        } else {
                                            callback();
                                        }
                                    },
                                    function () {
                                        console.log(characteristicInfo);
                                        characteristicIndex++;
                                        callback();
                                    }
                                ]);
                            },
                            function (error) {
                                serviceIndex++;
                                callback();
                            }
                        );
                    });
                },
                function (err) {
                    peripheral.disconnect();
                }
            );
        });
    });
};

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
                    console.log('\t\t' + JSON.stringify(serviceData[i].uuid) + ': XXX ' + JSON.stringify(serviceData[i].data.toString('hex')));
                }
            }
            if (peripheral.advertisement.txPowerLevel !== undefined) {
                console.log('\tmy TX power level is:');
                console.log('\t\t' + peripheral.advertisement.txPowerLevel);
            }
            console.log();
            connect(peripheral);
        }
    }

};

app.listen(3020, function () {
    console.log('Timeflip listening on port 3020');
    noble.on('stateChange', function (state) {
        if (state === 'poweredOn') {
            noble.startScanning();
        } else {
            noble.stopScanning();
        }
    });
    noble.on('discover', discover);
});