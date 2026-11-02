"""WebView2 页面验收：营销条、教程导航、复制按钮反馈与实际页面截图。"""
import base64
import json
import os
import tempfile
import time
import webview
from launch import ROOT, ensure_server

OUT=ROOT/'.output-test'
OUT.mkdir(exist_ok=True)
url,server=ensure_server()
window=webview.create_window('免费版页面验收',url,width=1420,height=1000)
report={'ok':False}

def wait(script):
    end=time.monotonic()+30
    while time.monotonic()<end:
        try:
            value=window.evaluate_js(script)
            if value:return value
        except Exception:
            pass
        time.sleep(.2)
    raise AssertionError('页面等待超时: '+script)

def capture(name):
    from System import Action
    tasks=[]
    browser=window.native.webview
    browser.Invoke(Action(lambda:tasks.append(browser.CoreWebView2.CallDevToolsProtocolMethodAsync('Page.captureScreenshot','{"format":"png"}'))))
    end=time.monotonic()+15
    while not tasks[0].IsCompleted:
        if time.monotonic()>end:raise TimeoutError('截图超时')
        time.sleep(.1)
    data=json.loads(str(tasks[0].Result))
    (OUT/name).write_bytes(base64.b64decode(data['data']))

def run():
    try:
        wait("document.querySelector('#battle-canvas') && document.querySelector('.promo')")
        time.sleep(3)
        assert window.evaluate_js("document.querySelector('.promo').textContent.includes('Mc9988889999')")
        window.evaluate_js("document.querySelector('#tab-pro').click()")
        assert window.evaluate_js("!document.querySelector('#panel-pro').hidden")
        window.evaluate_js("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text)=>{window.copiedContact=text}}});document.querySelector('#panel-pro [data-copy-wechat]').click()")
        wait("document.querySelector('#panel-pro .copy-status').textContent.includes('已复制')")
        assert window.evaluate_js('window.copiedContact')=='Mc9988889999'
        capture('community-home.png')
        assert window.evaluate_js("Array.from(document.querySelectorAll('a[href$=\".html\"]')).every(a=>a.target==='_blank')")
        for page in ['guide.html','features.html','purchase.html']:
            window.load_url(url+page)
            wait("location.pathname.endsWith('"+page+"') && document.querySelector('.docs h1')")
            assert window.evaluate_js("document.documentElement.scrollWidth<=innerWidth")
            assert window.evaluate_js("document.querySelector('.promo').textContent.includes('大雨')")
            capture(page.replace('.html','.png'))
        window.evaluate_js("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('模拟拒绝')}}});document.querySelector('[data-copy-wechat]').click()")
        wait("document.querySelector('.copy-status').textContent.includes('手动复制')")
        report.update(ok=True,pages=4,copySuccessFeedback=True,copyFailureFeedback=True,horizontalOverflow=False)
    except Exception as error:
        report['error']=str(error)
    finally:
        (OUT/'ui.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        window.destroy()

webview.start(run,gui='edgechromium',private_mode=False,storage_path=tempfile.mkdtemp(prefix='arena-ui-test-'))
if server:
    server.shutdown();server.server_close()
print(json.dumps(report,ensure_ascii=False))
raise SystemExit(0 if report['ok'] else 1)
