# bootstrap-fileUpload
兼容ie，提供异步上传、缩略图显示等功能。

## Snapshot
![snapshot](https://raw.githubusercontent.com/stkevintan/bootstrap-fileUpload/master/snapshot/overview.png)

## Install
```bash
npm i
node server #启动测试服务器
node server -c #生成静态文件
```
## Usage
``` javascript
const up = $('m-upload').fileUpload({
    multiple: true, //是否允许上传多个文件
    async: true, //是否异步上传
    url: 'library',  //异步上传的地址，默认值：当前元素最近的form元素的action地址。
    preview: 'thumbnail' //如何展示，(thumbnail|filename|none)
})
```
## Methods
To do...

