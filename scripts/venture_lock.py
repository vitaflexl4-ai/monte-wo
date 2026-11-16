"""Owner-requested public holding treatment. Original venture data stays intact."""
def locked_gallery():
    return '<section class="portfolio frame launch-hold" id="ventures" aria-labelledby="launch-title"><span class="index-label">THE PORTFOLIO</span><span class="launch-rule" aria-hidden="true"></span><h2 id="launch-title">Launching soon</h2></section>'

def locked_page(page,path,index):
    body='<section class="frame launch-hold launch-page" aria-labelledby="launch-title"><span class="index-label">THE PORTFOLIO</span><span class="launch-rule" aria-hidden="true"></span><h1 id="launch-title">Launching soon</h1><a class="launch-return" href="/#ventures">← The portfolio</a></section>'
    return page(f'Launching soon | {index:02d}',f'Portfolio {index:02d}. Updates will be shared when ready.',body,path).replace('</head>','<link rel="stylesheet" href="/portfolio.css"></head>')
