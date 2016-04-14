/**
 * Created by kevin on 16-4-12.
 */
import Styles from '../styles/_fileUpload.scss';

export default class FileUpload {
    FileList = []
    support = ['FileReader', 'FormData', 'URL'].reduce((pre, now)=>pre && (now in window), true)
    K = 1024
    M = 1024 * this.K
    G = 1024 * this.M
    constants = {
        //status
        READY: 'READY',
        CANCELLED: 'CANCELLED',
        UPLOADING: 'UPLOADING',
        FAILED: 'FAILED',
        UPLOADED: 'UPLOADED',
        //Event
        EVENT_UNFINISHED: 'unfinished',
        EVENT_FAILED: 'failed',
        EVENT_CANCELLED: 'cancelled',
        EVENT_UPLOADING: 'uploading',
        EVENT_UPLOADED: 'uploaded'
    }
    Counter = 0

    FileWrapper(obj) {
        this.file = obj.file;
        this.el = obj.el;
        this.state = obj.state || this.READY
    }

    constructor(rootEl, config = {}) {
        if (typeof rootEl === 'undefined' || !(rootEl instanceof $) || rootEl.length === 0)return;//Nothing to do...
        this.$dropper = rootEl.addClass('fileUpload-dropper');
        this.$viewer = $(this.$dropper.attr('data-target')).addClass('fileUpload-viewer');
        this.config = Object.assign({
            preview: 'filename',
            multiple: false,
            async: false,
            name: rootEl.attr('data-name') || 'file',
            url: rootEl.closest('form').attr('action') || '',
            icon: require('../images/file.png')
        }, config);
        this.check();
        this.domInit();
        this.listen();

    }

    getTotalState = ()=> {
        return this.FileList.some(fileWrapper =>fileWrapper.state !== this.constants.UPLOADING) ?
            this.constants.READY : this.constants.UPLOADING
    }
    check = ()=> {
        //check
        if (this.$viewer.length === 0)this.config.preview = 'none';

        if (!this.support && this.config.preview !== 'none') {
            console.error('[FileUpload] Cannot read File. File Object is not supported in current browser.');
            this.config.preview = 'none';
        }

        if (!this.support && this.config.async === true) {
            console.error('[FileUpload] Cannot async upload files, fileReader is not supported in current browser.');
            this.config.async = false;
        }

        if (this.config.async && this.config.url.trim().length === 0) {
            console.error('[FileUpload] Cannot upload without knowing the destination .')
            this.config.async = false;
        }

    }

    domInit = ()=> {
        this.$dropper.css('position', 'relative');
        this.$input = this.$dropper.append(`
            <input 
                type='file' 
                name="${this.config.name}"
                style="position:absolute;opacity:0;filter: progid:DXImageTransform.Microsoft.Alpha(opacity=0);top:0;left:0;height: 100%;width:100%;cursor:pointer;"
                ${this.config.multiple ? "multiple" : ""}
            />
        `).children(`input`).last();
        if (this.config.preview !== 'none')
            this.$list = this.$viewer.empty().append('<ul class="list-unstyled"></ul>').children('ul').last();
    }
    listen = ()=> {
        this.$dropper.on('dragover', () => {
            this.$dropper.addClass('dropping');
        });
        this.$dropper.on('dragleave', ()=> {
            this.$dropper.removeClass('dropping');
        });
        this.$input.on('change', ()=> {
            if (this.support)this.onChange(this.$input[0].files);
        });
        this.$viewer.on('click', 'li .close', (e) => {
            e.preventDefault();
            this.onCloseBtnClick($(e.currentTarget).parent());
        });

        if (this.support) {
            this.$dropper.closest('form').submit((e)=> {
                this.$input.val('');
                if (this.config.async && this.getTotalState() === this.constants.UPLOADING) {
                    //if the fileUploading is still processing.
                    this.$dropper.trigger(this.constants.EVENT_UNFINISHED, [e]);
                }
            });
        }
    }

    onChange = (files)=> {
        this.$dropper.removeClass('dropping');
        if (files.length === 0) return;
        if (this.support === false) {
            this.$list.empty();
            this.FileList = [];
        }

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            this.addFile(file);
        }
    }

    get$li(filename, filesize, file) {
        if (this.config.preview === 'none') return;
        const $li = $(document.createElement('li'));
        $li.append(`<div class="info">  <span class="name">${filename}</span><small class='text-muted'>${filesize}</small></div>`);
        if (this.config.preview === 'thumbnail') {
            const isImage = /^image/.test(file.type);
            const img = document.createElement('img');
            img.src = isImage ? window.URL.createObjectURL(file) : this.config.icon;
            if (isImage) {
                img.onload = function () {
                    window.URL.revokeObjectURL(this.src)
                };
            }
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'img-wrapper';
            imgWrapper.appendChild(img);
            $li.prepend(imgWrapper);
        }
        if (this.support) $li.append(' <button class="close">&times;</button>');
        if (this.config.async) {
            $li.append(`<div class="progress"><div class="progress-bar"style="min-width: 2em;">0%</div></div>`);
        }
        return $li;
    }

    addFile = (file) => {
        let name = file.name;
        let size = this.normalizeSize(file.size);
        const fileWrapper = new this.FileWrapper({file, el: this.get$li(name, size, file)});
        this.config.preview !== 'none' && this.$list.append(fileWrapper.el);
        this.FileList.push(fileWrapper);

        if (this.config.async) {
            const formData = new FormData();
            formData.append(this.config.name, file);
            $.ajax({
                url: this.config.url,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                xhr: () => {
                    const xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener('progress', (e)=> {
                        let percent = 0;
                        if (e.lengthComputable) {
                            percent = e.loaded / e.total;
                            this.changeProgress(fileWrapper.el, percent);
                        }

                        if (fileWrapper.state === this.constants.CANCELLED) {
                            xhr.abort();
                        }

                        fileWrapper.state = this.constants.UPLOADING;
                        this.$dropper.trigger(this.constants.EVENT_UPLOADING, [percent, fileWrapper])
                    }, false);
                    return xhr;
                }
            }).done((res)=> {
                const data = JSON.parse(res);
                fileWrapper.id = data.id || Counter++;
                fileWrapper.state = this.constants.UPLOADED;
                this.$dropper.trigger(this.constants.EVENT_UPLOADED, [fileWrapper]);
            }).fail((err)=> {
                console.error('[File Upload]', err);
                this.FileList.splice(this.FileList.lastIndexOf(fileWrapper), 1);
                //TODO 错误处理
                this.changeProgress(fileWrapper.el);
                //fileWrapper.el.append(`<span class='text-danger'>上传失败</span>`);

                fileWrapper.state = this.constants.FAILED;
                /***
                 * @param err {Object}
                 * @param file {File}
                 * @param $elem {jQuery}
                 */
                this.$dropper.trigger(this.constants.EVENT_FAILED, [err, fileWrapper]);
            });
        }
    }

    changeProgress = ($li, percent = 0)=> {
        const bar = $li.find('.progress-bar');
        bar.css('width', $li.width() * percent);
        bar.text((percent * 100).toFixed(0) + '%');
    }

    getFileList = () => this.FileList.map(obj => obj.file);

    onCloseBtnClick = ($li) => {
        if (!this.support) return;//just impossible...
        //get the fileWrappper Object
        const index = this.FileList.findIndex(fw => fw.el[0] === $li[0]);
        if (index === -1) {
            // It's impossible,I think...
            $li.remove();
            return;
        }
        const fileWrapper = this.FileList[index];

        if (!this.config.async) {
            $li.remove();
            this.FileList = this.FileList.splice(index, 1);
        } else if (fileWrapper.state === this.constants.UPLOADING) {
            //change state to cancelled, and the event loop will handle the rest...
            fileWrapper.state = this.constants.CANCELLED;
            this.$dropper.trigger(this.constants.EVENT_CANCELLED, [fileWrapper]);
        } else {
            this.removeFileById(fileWrapper.id);
        }
    }
    removeFileById = (id)=> {
        const index = this.FileList.findIndex(fw => fw.id === id);
        if (index === -1)return;
        $.ajax({
            url: this.config.url,
            type: 'DELETE',
            data: id || 0
        }).done(() => {
            this.FileList[index].el.remove();
            this.FileList.splice(index, 1);
        });
    }

    normalizeSize = (size) => {
        if (size > this.G) return (size / this.G).toFixed(2) + 'G';
        if (size > this.M) return (size / this.M).toFixed(2) + 'M';
        if (size > this.K) return (size / this.K).toFixed(2) + 'KB';
        return size.toFixed(2) + 'B';
    }
}

$.fn['fileUpload'] = function (opts) {
    if (this.length === 0) return;
    const $rootEl = $(this[0]);
    up = new FileUpload($rootEl, opts);
    return {
        getFileList: ()=> {
            up.getFileList(...arguments);
            return this;
        },
        addFile: ()=> {
            up.addFile(...arguments);
            return this;
        },
        removeFile: ()=> {
            up.removeFileById(...arguments);
            return this;
        },
        on: ()=> {
            this.$dropper.on(...arguments);
            return this;
        },
        off: ()=> {
            this.$dropper.off(...arguments);
            return this;
        },
        one: ()=> {
            this.$dropper.one(...arguments);
            return this;
        }
    }
}