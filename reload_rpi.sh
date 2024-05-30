./update_lib.sh
tsc
npx webpack -c webpack.config-rpi.js
rsync -v dist/rpi/app.js pi@10.42.0.138:~/ommatidia-standalone/app.js