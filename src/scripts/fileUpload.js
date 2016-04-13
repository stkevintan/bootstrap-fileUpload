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

    FileWrapper(obj) {
        this.file = obj.file;
        this.el = obj.el;
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

    check = ()=> {
        //check
        if (this.$viewer.length === 0)this.config.preview = 'none';

        if (!this.support && this.config.preview === 'thumbnail') {
            console.error('[FileUpload] cannot read image thumbnail. fileReader is not supported in current browser.');
            this.config.preview = 'filename';
        }

        if (!this.support && this.config.async === true) {
            console.error('[FileUpload] cannot async upload files, fileReader is not supported in current browser.');
            this.config.async = false;
        }

        if (this.config.async && this.config.url.trim().length === 0) {
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
            this.onChange(this.$input[0].files);
        });
        this.$viewer.on('click', 'li .close', (e) => {
            e.preventDefault();
            this.removeFile($(e.currentTarget).parent());
        });
        if (this.support) {
            this.$dropper.closest('form').submit((e)=> {
                this.$input.val('');
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
        const newFile = new this.FileWrapper({file, el: this.get$li(name, size, file)});
        this.$list.append(newFile.el);
        this.FileList.push(newFile);
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
                        newFile.el.addClass('uploading');
                        if (e.lengthComputable) {
                            const percent = e.loaded / e.total;
                            this.changeProgress(newFile.el, percent);
                        }
                        if (newFile.el.hasClass('canceled')) {
                            xhr.abort();
                        }
                    }, false);
                    return xhr;
                }
            }).done((res)=> {
                const data = JSON.parse(res);
                newFile.el.attr('data-id', data.id).removeClass('uploading');
            }).fail((err)=> {
                console.log(err);
                this.FileList.splice(this.FileList.indexOf(newFile), 1);
                //TODO 错误处理
                this.changeProgress(newFile.el);
                newFile.el.append(`<span class='text-danger'>上传失败</span>`)
                    .removeClass('uploading').addClass('failed');
            });
        }
    }

    changeProgress = ($li, percent = 0)=> {
        const bar = $li.find('.progress-bar');
        bar.css('width', $li.width() * percent);
        bar.text((percent * 100).toFixed(0) + '%');
    }

    getFileList = () => this.FileList.map(obj => obj.file);

    removeFile = ($li) => {
        if (!this.support)return;//just cannot remove
        if (!this.config.async || $li.hasClass('canceled')) {
            $li.remove();
            this.FileList = this.FileList.filter(File=> File.el !== $li);
            return;
        }
        if ($li.hasClass('uploading'))  $li.removeClass('uploading').addClass('canceled');
        else {
            const id = $li.attr('data-id');
            $.ajax({
                url: this.config.url,
                type: 'DELETE',
                data: $li.attr('data-id') || 0
            }).done(() => {
                $li.remove();
                this.FileList = this.FileList.filter(File=> File.el[0] !== $li[0]);
            });
        }
    }
    normalizeSize = (size) => {
        if (size > this.G) return (size / this.G).toFixed(2) + 'G';
        if (size > this.M) return (size / this.M).toFixed(2) + 'M';
        if (size > this.K) return (size / this.K).toFixed(2) + 'KB';
        return size.toFixed(2) + 'B';
    }
    // addImage = (file)=> {
    //     const reader = new FileReader();
    //     reader.readAsDataURL(file);
    //     reader.addEventListener('load', () => {
    //         this.addPreview(reader.result, file.name);
    //     });
    // }
}