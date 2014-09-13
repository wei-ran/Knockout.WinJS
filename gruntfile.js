module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({

        //Read the package.json (optional)
        pkg: grunt.file.readJSON('package.json'),

        // Metadata.
        meta: {
            basePath: './',
            srcPath: './src/',
            deployPath: './bin/'
        },

        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> ',

        tsd: {
            refresh: {
                options: {
                    // execute a command
                    command: 'reinstall',

                    //optional: always get from HEAD
                    latest: true,

                    // optional: specify config file
                    config: './tsd.json',

                    // experimental: options to pass to tsd.API
                    opts: {
                        // props from tsd.Options
                    }
                }
            }
        },

        typescript: {
            base: {
                src: ['src/*.ts'],
                dest: 'bin/Knockout.WinJS.js',
                options: {
                    //module: 'amd', //or commonjs
                    target: 'es5', //or es3
                    basePath: '.',
                    sourceMap: true,
                    declaration: true
                }
            }
        },

        //concat: {
        //    options: {
        //        stripBanners: true
        //    },
        //    dist: {
        //        src: ['<%= meta.srcPath %>/Knockout.WinJS.js', '<%= meta.srcPath %>/defaultBind.js'],
        //        dest: '<%= meta.deployPath %>/Knockout.WinJS.js'
        //    }
        //}
    });

    grunt.loadNpmTasks('grunt-tsd');

    grunt.loadNpmTasks('grunt-typescript');

    // Default task
    grunt.registerTask('default', ['tsd'], ['typescript']);

};