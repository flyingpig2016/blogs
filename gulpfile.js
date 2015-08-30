var fs = require('fs');

var gulp = require('gulp');
var gulpJade = require('gulp-jade');
var jade = require('jade');
var marked = require('marked');
var webserver = require('gulp-webserver');
var etpl = require('etpl');

marked.setOptions({
    highlight: function (code) {
        return require('highlight.js').highlightAuto(code).value;
    }
});

jade.filters.md = function (str) {
    return marked(str)
        .replace(/url\(\.\/imgs\//g, 'url(../../imgs/')
        .replace(/src="\.\/imgs\//g, 'src="../../imgs/');
};

var siteRoot = './site';

gulp.task('jade-index', function () {
    gulp.src(siteRoot + '/index.jade')
        .pipe(gulpJade({
            jade: jade
        }))
        .on('error', function(err){
            console.log(err.message);
        })
        .pipe(gulp.dest(siteRoot));
});

gulp.task('jade-blogs', function () {
    gulp.src(siteRoot + '/blogs/*.jade')
        .pipe(gulpJade({
            jade: jade
        }))
        .on('error', function(err){
            console.log(err.message);
        })
        .pipe(gulp.dest(siteRoot + '/blogs'));
});

// 生成对应于 src 目录下面的 md 博客文件的 jade 文件
// 以及 titles.jade
gulp.task('create-blog-pages', function (doneFn) {
    try {
        var srcPath = './src';
        var mdFiles = fs.readdirSync(srcPath);
        mdFiles.forEach(function (fileName) {
            if (fileName.slice(-3) !== '.md') {
                return;
            }

            var jadeFilePath = siteRoot + '/blogs/' + fileName.slice(0, -3) + '.jade';
            var jadeContent = [
                'extends ../layout.jade',
                'block blog',
                '    include:md ../../src/' + fileName
            ].join('\r');

            fs.writeFileSync(jadeFilePath, jadeContent);
        });

        // 排一下序
        mdFiles = mdFiles.map(function (fileName) {
            var mdStr = fs.readFileSync(srcPath + '/' + fileName);
            return {
                time: getBlogTime(String(mdStr)),
                fileName: fileName
            };
        }).sort(function (a, b) {
            return b.time.getTime() - a.time.getTime();
        }).map(function (fileObj) {
            return fileObj.fileName;
        });

        var titlesContent = [
            'h3',
            '    a(href="#{rootPath}/index.html") 首页',
            mdFiles.map(function (fileName) {
                if (fileName.slice(-3) !== '.md') {
                    return '';
                }
                return 'h5\r    a(href="#{rootPath}/blogs/'
                    + fileName.slice(0, -3) + '.html") '
                    + fileName.slice(0, -3);
            }).join('\r')
        ].join('\r');
        fs.writeFileSync(siteRoot + '/titles.jade', titlesContent);

        doneFn();
    }
    catch (error) {
        doneFn(error);
    }

    // 拿到 blog 发布时间
    function getBlogTime(mdStr) {
        var timeMatch = mdStr.match(/<!-- config.time: ([0-9|\-|:|\s]+) -->/);
        if (timeMatch && timeMatch.length >= 2) {
            return new Date(timeMatch[1]);
        }
        return new Date();
    }
});

gulp.task('set-jade-test-root-path', function () {
    var path = siteRoot + '/layout.jade';
    fs.writeFileSync(
        path,
        '- var rootPath = "/site"\r' + String(fs.readFileSync(path)).replace(/\- var rootPath = ".*"\r\n{0,1}/g, '')
    );
});

gulp.task('set-jade-build-root-path', function () {
    var path = siteRoot + '/layout.jade';
    fs.writeFileSync(
        path,
        '- var rootPath = "/blogs/site"\r' + String(fs.readFileSync(path)).replace(/\- var rootPath = ".*"\r\n{0,1}/g, '')
    );
});

gulp.task('static-server', function () {
    gulp.src('./')
        .pipe(webserver({
            //livereload: true,
            directoryListing: true//,
            //open: 'http://127.0.0.1:8000/site/index.html'
        }));
});

gulp.task(
    'watch',
    ['static-server', 'set-jade-test-root-path', 'create-blog-pages', 'jade-blogs', 'jade-index'],
    function () {
        gulp.watch('./src/*.md', ['set-jade-test-root-path', 'create-blog-pages', 'jade-blogs', 'jade-index']);
    }
);

gulp.task('build', ['set-jade-build-root-path', 'create-blog-pages', 'jade-blogs', 'jade-index']);
