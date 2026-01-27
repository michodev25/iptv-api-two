try {
    console.log('Testing sqlite3...');
    require('sqlite3');
    console.log('sqlite3 OK');

    console.log('Testing db config...');
    require('./src/config/db');
    console.log('db config OK');

    console.log('Testing main routes...');
    require('./src/routes/main');
    console.log('main routes OK');

    console.log('Testing server file...');
    require('./server');
    console.log('server file OK');

} catch (err) {
    console.error('DEBUG ERROR:', err);
}
