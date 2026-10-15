import sys, time, json
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]
import os
url = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'index.html'))
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    # 1) 사람 플레이 흐름 (휴대폰)
    pg = b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(url); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+'/setup.png')
    pg.click('#sGo'); pg.wait_for_timeout(300)
    moves = 0
    for it in range(400):
        st = pg.evaluate('({phase:__yut.G.phase, ai:!!__yut.G.teams[__yut.G.turn].ai})')
        if st['phase'] == 'over': break
        if st['ai']: pg.wait_for_timeout(300); continue
        if pg.locator('.veil').count(): break
        if st['phase'] == 'throw':
            if pg.is_enabled('#bThrow'): pg.click('#bThrow'); pg.wait_for_timeout(1500)
            else: pg.wait_for_timeout(200)
        else:
            rings = pg.locator('.ringhit')
            if rings.count():
                rings.nth(0).click(force=True); moves += 1; pg.wait_for_timeout(1400)
            else: pg.wait_for_timeout(200)
        if it == 6: pg.screenshot(path=OUT+'/play-phone.png')
    print('사람 이동', moves, '상태', pg.evaluate('__yut.G.phase'), 'seq', pg.evaluate('__yut.G.seq'))
    # 새로고침 후 이어하기
    seq = pg.evaluate('__yut.G.seq'); pg.reload(); pg.wait_for_timeout(500)
    print('새로고침 복원', pg.evaluate('__yut.G.seq') == seq)
    # 2) 컴퓨터 4명 빠른 완주 (데스크톱, 어두운 화면)
    pg2 = b.new_page(viewport={'width':1280,'height':800}, color_scheme='dark')
    pg2.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg2.on('pageerror', lambda e: errs.append(str(e)))
    pg2.goto(url); pg2.wait_for_timeout(300)
    pg2.evaluate("""()=>{localStorage.clear();}"""); pg2.reload(); pg2.wait_for_timeout(300)
    pg2.click('#sN button:nth-child(3)')
    for i in range(4): pg2.select_option('#seatWho%d'%i, 'hard')
    pg2.evaluate('__yut.speed = 0.05')
    pg2.click('#sGo')
    pg2.wait_for_timeout(1500)
    pg2.screenshot(path=OUT+'/play-desk-dark.png')
    t0=time.time()
    while pg2.evaluate('__yut.G.phase') != 'over' and time.time()-t0 < 300: pg2.wait_for_timeout(1000)
    print('컴퓨터 4명 완주', pg2.evaluate('__yut.G.phase'), round(time.time()-t0), '초', 'seq', pg2.evaluate('__yut.G.seq'))
    pg2.wait_for_timeout(800)
    pg2.screenshot(path=OUT+'/win.png')
    pg2.click('#wAgain'); pg2.wait_for_timeout(300)
    print('한 판 더', pg2.evaluate('__yut.G.phase'))
    # 규칙 시트 (휴대폰 밝은)
    pg.click('#bRules') if not pg.locator('.veil').count() else None
    pg.wait_for_timeout(300); pg.screenshot(path=OUT+'/rules.png')
    # 가로 스크롤 검사
    print('가로 넘침', pg.evaluate('document.documentElement.scrollWidth > innerWidth'))
    b.close()
print('오류', errs)
