"""公开版静态服务不得向浏览器暴露登录资料和运行缓存。"""
import unittest
from urllib.error import HTTPError
from launch import ensure_server, local_get, DesktopApi

class PublicServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.url, cls.server = ensure_server()

    @classmethod
    def tearDownClass(cls):
        if cls.server:
            cls.server.shutdown()
            cls.server.server_close()

    def test_pages_and_assets(self):
        for path in ['', 'guide.html', 'features.html', 'purchase.html', 'battle-app.mjs', 'assets/generated/avatar-names.json']:
            with local_get(self.url + path) as response:
                self.assertEqual(response.status, 200)

    def test_private_paths_denied(self):
        for path in ['.git/config', '%2e%76env/pyvenv.cfg', 'avatar-cache.json', 'launch.py', 'desktop-bridge.log', 'assets/', '.live-webview-profile/Default/Preferences', '../avatar-camp-battle/launch.py']:
            with self.assertRaises(HTTPError) as error:
                local_get(self.url + path)
            self.assertEqual(error.exception.code, 404)

    def test_no_ranking_api(self):
        api=DesktopApi()
        self.assertFalse(hasattr(api, 'save_rankings'))
        self.assertFalse(hasattr(api, 'load_rankings'))
        self.assertFalse(hasattr(api, 'export_rankings'))

if __name__ == '__main__':
    unittest.main()
