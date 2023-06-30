## cli-phomemo-printer

a nodejs script that allows you to print images to a phomemo printer.

Tested with [phomemo M02s](https://phomemo.com/collections/phomemo-m02s). 



https://github.com/vrk/cli-phomemo-printer/assets/610200/edcb1904-9748-4fbc-8a5c-6d164e96b8fd



### How to install & run

This isn't listed on npm (yet?) so you need to clone and build locally to run, e.g.

```
$ git clone git@github.com:vrk/cli-phomemo-printer.git
$ npm install
$ node index.js
```

If you run it without command-line arguments, you'll print out a burger sticker.

#### cli args

```
Options:
  -f, --file <path>   path for image to print (default: "./burger.png")
  -s, --scale <size>  percent scale at which the image should print (1-100+) (default: 100)
  -h, --help          display help for command
```

### IMPORTANT USAGE NOTES

1. **If you're not using the Phomemo M02S:** You will need to edit `index.js` to change `BYTES_PER_LINE` to match your paper. IDK what's the math for this, I just used guess & check to figure it out lol. 
2. **If you're using smaller receipt paper:** The Phomemo M02S comes with 3 sizes of paper, 53mm (default), 25mm, 15mm. If you're using anything other than 53mm, you're going to have to scale the image using the `-s` flag, e.g. `-s 50` for 25mm paper.
3. **Known issue:** I've found that the dithering library I'm using doesn't work well on black & white images. I'll swap it out later...


### Credits

This code was cobbled together by reading the very helpful breadcrumbs left by:

- [vivier/phomemo-tools](https://github.com/vivier/phomemo-tools): lifesaver for having the protocol documented
- [Phomemo Thermal Printing On MacOS](https://brainbaking.com/post/2023/02/phomemo-thermal-printing-on-macos/): gave me faith that this was even possible!
