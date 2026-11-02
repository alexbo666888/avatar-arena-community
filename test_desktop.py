"""原生 WebView2 验收：真实渲染、互动与横竖屏画面传输。"""
import base64
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import webview
from launch import ensure_server, ROOT, DesktopApi

OUT=ROOT/'.output-test';OUT.mkdir(exist_ok=True)
viewer='--viewer' in sys.argv
port=int(sys.argv[-1]) if viewer else None
os.environ['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS']='--disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling'
server=None
if viewer:
    url=f'http://127.0.0.1:{port}/live-view.html'
else:
    url,server=ensure_server()
    url += "?test=1"
    for name in ['main.json','viewer.json','viewer-error.json','portrait.request','portrait.json']:
        (OUT/name).unlink(missing_ok=True)
window=webview.create_window('红蓝对战 · 本地验收',url,width=1420,height=960,js_api=DesktopApi())
failed=False

def evaluate(code):
    script='(()=>{try{return JSON.stringify({value:eval('+json.dumps(code)+')})}catch(e){return JSON.stringify({error:String(e)})}})()'
    result=window.run_js(script)
    if result is None:raise RuntimeError('WebView2 脚本未返回结果')
    data=json.loads(result)
    if 'error' in data:raise RuntimeError(data['error'])
    return data.get('value')

def wait(code,seconds=45):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        try:
            result=evaluate(code)
            if result:return result
        except Exception:pass
        time.sleep(.25)
    raise AssertionError('等待超时: '+code)

def file_wait(name,seconds=40):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        if (OUT/name).exists():return json.loads((OUT/name).read_text(encoding='utf-8'))
        if (OUT/'viewer-error.json').exists():raise AssertionError((OUT/'viewer-error.json').read_text())
        time.sleep(.25)
    raise AssertionError('等待文件超时: '+name)

def run():
    global failed
    child=None;report={}
    try:
        if viewer:
            wait("document.querySelector('video')?.videoWidth>0",25)
            dimensions=evaluate("({width:document.querySelector('video').videoWidth,height:document.querySelector('video').videoHeight})")
            assert dimensions=={'width':1280,'height':720},dimensions
            before=evaluate("document.querySelector('video').getVideoPlaybackQuality().totalVideoFrames")
            time.sleep(3)
            after=evaluate("document.querySelector('video').getVideoPlaybackQuality().totalVideoFrames")
            assert after>before,'横屏画面未持续播放'
            (OUT/'viewer.json').write_text(json.dumps({'framesIn3Seconds':after-before,'width':1280,'height':720}))
            file_wait('portrait.request')
            wait("document.querySelector('video').videoWidth===1080&&document.querySelector('video').videoHeight===1920")
            before=evaluate("document.querySelector('video').getVideoPlaybackQuality().totalVideoFrames")
            time.sleep(3)
            after=evaluate("document.querySelector('video').getVideoPlaybackQuality().totalVideoFrames")
            assert after>before,'竖屏画面未持续播放'
            (OUT/'portrait.json').write_text(json.dumps({'framesIn3Seconds':after-before,'width':1080,'height':1920}))
            time.sleep(3)
        else:
            wait("typeof window.battleTest==='object'")
            time.sleep(5)
            report['initial']=evaluate('battleTest.diagnostics()')
            assert evaluate("document.querySelector('.promo').textContent.includes('Mc9988889999')")
            assert evaluate("document.querySelector('#panel-pro').textContent.includes('单独交付')")
            assert report['initial']['heads']>=4,'小人头像头部未生成'
            image=wait('battleTest.screenshot()')
            (OUT/'battle-landscape.png').write_bytes(base64.b64decode(image.split(',')[1]))
            evaluate("document.querySelector('#pause').click()")
            before=evaluate('battleTest.diagnostics().time');time.sleep(.6)
            assert evaluate('battleTest.diagnostics().time')==before,'暂停未冻结战斗'
            evaluate("document.querySelector('#pause').click()")
            evaluate("battleTest.reset();battleTest.event({name:'红队测试',type:'comment',text:'红'});battleTest.event({name:'蓝队测试',type:'comment',text:'蓝'});battleTest.event({name:'红队测试',type:'gift',gift:'beer',count:1})")
            time.sleep(1.5)
            state=evaluate('battleTest.diagnostics()')
            assert state['total']=={'red':2,'blue':1},state
            assert all(u['weapon']=='fist' for u in state['units']),state
            report['eventRules']=state
            evaluate("document.querySelector('#reinforce').click()")
            from urllib.parse import urlparse
            child=subprocess.Popen([sys.executable,__file__,'--viewer',str(urlparse(url).port)],cwd=ROOT)
            wait("battleTest.diagnostics().connected==='connected'")
            report['landscape']=file_wait('viewer.json')
            evaluate("(()=>{const s=document.querySelector('#orientation');s.value='portrait-1080p';s.dispatchEvent(new Event('change'))})()")
            (OUT/'portrait.request').write_text('{}')
            report['portrait']=file_wait('portrait.json')
            image=wait('battleTest.screenshot()');(OUT/'battle-portrait.png').write_bytes(base64.b64decode(image.split(',')[1]))
            report['final']=evaluate('battleTest.diagnostics()');assert not report['final']['errors'],report['final']['errors']
            evaluate('battleTest.step(battleTest.diagnostics().remaining+.1)')
            report['settlement']=evaluate('battleTest.diagnostics()')
            assert report['settlement']['phase']=='result',report['settlement']
            image=wait('battleTest.screenshot()');(OUT/'battle-result.png').write_bytes(base64.b64decode(image.split(',')[1]))
            report['ok']=True
            (OUT/'main.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    except Exception as e:
        failed=True;report.update(ok=False,error=str(e))
        (OUT/('viewer-error.json' if viewer else 'main.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    finally:
        if child and child.poll() is None:child.terminate();child.wait(timeout=10)
        window.destroy()

webview.start(run,gui='edgechromium',private_mode=False,storage_path=tempfile.mkdtemp(prefix='camp-test-'))
if server:server.shutdown();server.server_close()
sys.exit(1 if failed else 0)
