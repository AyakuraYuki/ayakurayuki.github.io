/* particlesJS.load(@dom-id, @path-json, @callback (optional)); */
var start = new Date().getTime();
var path = 'http://blog.ayakurayuki.cc/assets/js/';
var filename = 'particles.json';
particlesJS.load(
    'particles-js',
    '' + path + filename,
    function () {
        var end = new Date().getTime();
        console.log(
            '[' + (end - start) + ' ms] Done! ' + filename + ' loaded.'
        );
    }
);
