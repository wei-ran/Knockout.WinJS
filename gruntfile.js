module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({

        //Read the package.json (optional)
        pkg: grunt.file.readJSON('package.json'),

        // Metadata.
        meta: {
            basePath: './',
            srcPath: './src/',
            deployPath: './bin/',
            unittestsPath : "./unittests/"
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
                    config: '<%= meta.basePath %>/tsd.json',

                    // experimental: options to pass to tsd.API
                    opts: {
                        // props from tsd.Options
                    }
                }
            }
        },

        typescript: {
            base: {
                src: ['<%= meta.srcPath %>/*.ts'],
                dest: '<%= meta.deployPath %>/Knockout.WinJS.js',
                options: {
                    target: 'es5', //or es3
                    basePath: '.',
                    sourceMap: true,
                    declaration: true
                }
            },
            observableTests: {
                src: ['<%= meta.srcPath %>/*.ts', '<%= meta.unittestsPath %>/observableTests.ts'],
                dest: '<%= meta.deployPath %>/unittests/observableTests.js',
                options: {
                    target: 'es5', //or es3
                    basePath: '.',
                    sourceMap: true,
                    declaration: false
                }
            },
            defaultBindTests: {
                src: ['<%= meta.srcPath %>/*.ts', '<%= meta.unittestsPath %>/defaultBindTests.ts'],
                dest: '<%= meta.deployPath %>/unittests/defaultBindTests.js',
                options: {
                    target: 'es5', //or es3
                    basePath: '.',
                    sourceMap: true,
                    declaration: false
                }
            }
    
        },

        uglify: {
            my_target: {
                files: {
                    '<%= meta.deployPath %>/Knockout.WinJS.min.js': ['<%= meta.deployPath %>/Knockout.WinJS.js']
                }
            }
        },

        copy: {
            tests: {
                files: [
                  // includes files within path
                  { expand: true, src: ['<%= meta.unittestsPath %>/*.html'], dest: '<%= meta.deployPath %>/', filter: 'isFile' },
                ]
            }
        }

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

    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.loadNpmTasks('grunt-contrib-copy');


    // Default task
    grunt.registerTask('default', ['tsd', 'typescript', 'uglify', 'copy']);

};