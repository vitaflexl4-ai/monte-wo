"""A quiet, text-first founder essay, built with the existing group page shell.

Content stays in content/group/founder.json. No invented portrait, contact CTA,
resume widgets, external fonts, client JavaScript or unsupported biographical enrichment.
"""
from pathlib import Path
import html
import json

ROOT = Path(__file__).resolve().parent.parent


def render_founder(page):
    profile = json.loads((ROOT / 'content/group/founder.json').read_text())
    escape = lambda value: html.escape(str(value), quote=True)
    chapters = profile['chapters']
    navigation = ''.join(
        f'<a href="#{escape(chapter["id"])}"><span aria-hidden="true">{index:02d}</span>'
        f'{escape(chapter["title"])}</a>'
        for index, chapter in enumerate(chapters, 1)
    )
    sections = ''.join(
        f'<section class="founder-chapter" id="{escape(chapter["id"])}" '
        f'aria-labelledby="{escape(chapter["id"])}-title">'
        f'<h2 id="{escape(chapter["id"])}-title">{escape(chapter["title"])}</h2>'
        + ''.join(f'<p>{escape(paragraph)}</p>' for paragraph in chapter['paragraphs'])
        + '</section>'
        for chapter in chapters
    )
    body = f'''<article class="founder frame" aria-labelledby="founder-name">
      <header class="founder-intro">
        <p class="index-label">A PERSONAL NOTE</p>
        <h1 id="founder-name">{escape(profile['name'])}</h1>
        <p class="founder-subtitle">{escape(profile['title'])}</p>
      </header>
      <div class="founder-reading-layout">
        <aside class="founder-aside">
          <nav class="founder-chapters" aria-label="Biography chapters">
            <p class="index-label">IN THIS NOTE</p>
            {navigation}
          </nav>
        </aside>
        <div class="founder-prose">
          {sections}
          <div class="founder-closing">
            <p class="founder-conviction">{escape(profile['closing'])}</p>
            <p class="founder-postscript"><em>{escape(profile['postscript'])}</em></p>
            <p class="founder-signature">{escape(profile['name'])}</p>
          </div>
          <a class="back-link founder-return" href="/#ventures">Return to the portfolio</a>
        </div>
      </div>
    </article>'''
    url = 'https://vitaflexbusinessgroup.com/sony/'
    # Only identity, affiliation and interests supported by the owner/biography.
    # No jobTitle, unverified sameAs links, portrait, dates or address.
    # Institution/issuer names are omitted: none is currently published in the essay.
    structured_data = {
        '@context': 'https://schema.org',
        '@graph': [
            {'@type': 'Person', '@id': url + '#person', 'name': profile['name'],
             'url': url, 'description': profile['description'],
             'affiliation': {'@id': 'https://vitaflexbusinessgroup.com/#organization'},
             'mainEntityOfPage': {'@id': url + '#profile'},
             'hasCredential': [
                 {'@type': 'EducationalOccupationalCredential',
                  'name': "Bachelor's degree in Business Administration",
                  'credentialCategory': 'degree'},
                 {'@type': 'EducationalOccupationalCredential',
                  'name': 'Master of Business Administration (MBA)',
                  'credentialCategory': 'degree'}],
             'knowsAbout': ['Business administration', 'Leadership', 'Entrepreneurship',
                            'Fitness', 'Technology', 'Artificial intelligence',
                            'Continuous learning']},
            {'@type': 'ProfilePage', '@id': url + '#profile', 'url': url,
             'name': profile['seoTitle'], 'description': profile['description'],
             'inLanguage': 'en', 'mainEntity': {'@id': url + '#person'}},
            {'@type': 'Organization', '@id': 'https://vitaflexbusinessgroup.com/#organization',
             'name': 'VitaFlex Business Group', 'url': 'https://vitaflexbusinessgroup.com/'}
        ]
    }
    return page(profile['seoTitle'], profile['description'], body, '/sony/',
                structured_data=structured_data, exact_title=True)
