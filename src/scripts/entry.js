import FileUpload from './fileUpload';

$(() => {
    console.log('=w=');
    const up = $('.u-dropzone').fileUpload({
        multiple: true,
        async: true,
        url: 'library',
        preview: 'thumbnail'
    });

    up.on('uploading',function(e,percent,data){
        console.log('uploading',percent,data);
    });
    up.on('uploaded',function(e,data){
        console.log('uploaded',data);
    })

    const form = $('form');
    const url = form.attr('action');
    form.submit(e=> {
        const fileList = up.getFileList();
        if ('FormData' in window) {
            e.preventDefault();
            const formData = new FormData(form[0]);
            for (let file of fileList) {
                formData.append('data', file);
            }
            $.ajax({
                url,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
            }).done((res)=> {
                const data = JSON.parse(res);
                formHandler(data);
            }).fail(err=> {
                handlerError();
            })
        } else {
            //ie polyfill
            let $iframe = $('iframe.free'), iframe;
            if ($iframe.length === 0) {
                //create new iframe
                iframe = $('body').append(`<iframe style='display:none' name='responseFrame${$('iframe').length}'></iframe>`).find('iframe').last()[0];
            } else {
                iframe = $iframe.removeClass('free')[0];
            }

            form.attr('target', iframe.name);
            iframe.onload = ()=> {
                let doc = iframe.contentDocument || iframe.contentWindow.document;
                const plainRes = doc.getElementsByTagName('body')[0].innerText;
                try {
                    const data = JSON.parse(plainRes);
                    formHandler(data);
                } catch (e) {
                    handlerError();
                } finally {
                    iframe.className += ' free';
                }
            }
        }
    })
});

function formHandler(data) {
    console.log(data);
    //Do Something
}

function handlerError() {
    console.error('[form] data upload failed');
    //Do Something
}