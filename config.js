'use strict';
module.exports = {
    port: 8070,
    cacheOptions: {
        cacheFolder: 'cache',
        ttl: 3 * 60 * 60 * 24
    },
    permittedFolders: ['js', 'css', 'other'],
    configFolders: ['energinet-2014', 'energinet-2015', 'energinet-2016', 'energinet-2017'],
    redirect: 'energinet-2017/'
};
