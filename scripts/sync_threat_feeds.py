#!/usr/bin/env python3
import urllib.request
import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'disposable_domains.json')

SOURCES = [
    'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt',
    'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf',
]

def sync_feeds():
    os.makedirs(DATA_DIR, exist_ok=True)
    all_domains = set()

    for url in SOURCES:
        print(f"Fetching threat feed from {url}...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 TruthMail-ThreatSync/1.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8', errors='ignore')
                lines = [line.strip().lower() for line in content.splitlines() if line.strip() and not line.startswith('#')]
                all_domains.update(lines)
                print(f"Successfully loaded {len(lines)} domains from {url}")
        except Exception as e:
            print(f"Notice: Could not fetch online feed ({e}). Will use local fallback.")

    # Core high-priority disposable domains list
    core_disposable = [
        'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
        'yopmail.com', 'throwawaymail.com', 'trashmail.com', 'sharklasers.com',
        'getairmail.com', 'burnermail.io', 'maildrop.cc', 'dispostable.com',
        'fakeinbox.com', 'temp-mail.org', 'mytemp.email', 'nada.ltd',
        'crazymailing.com', 'zillamail.com', 'inboxkitten.com', 'mohmal.com',
        'emailondeck.com', 'tempail.com', 'guerrillamailblock.com', 'grr.la',
        'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
        'pokemail.net', 'spam4.me', 'bccto.me', 'chacuo.net', '027168.com',
        'discard.email', 'spambog.com', 'mailcatch.com', 'trashmail.net',
        'trashmail.org', 'mytempemail.com', 'deadaddress.com', 'e4ward.com',
        'gishpuppy.com', 'incognitomail.org', 'kasmail.com', 'mailblocks.com',
        'mailexpire.com', 'mailnull.com', 'meltmail.com', 'sneakemail.com',
        'spamex.com', 'spamfree24.org', 'spamgourmet.com', 'tempinbox.com',
        'temporaryforwarding.com', 'trashymail.com', 'whyspam.me', 'jetable.org',
        'mailforspam.com', 'dropmail.me', '10minutemail.net', 'minutemail.com',
        'harakirimail.com', 'binkmail.com', 'bobmail.info', 'chammy.info',
        'devnullmail.com', 'letthemeatspam.com', 'mailin8r.com', 'mailinator2.com',
        'notmailinator.com', 'reallymymail.com', 'reconmail.com', 'safetymail.info',
        'sendspamhere.com', 'sogetthis.com', 'spambooger.com', 'spamherelots.com',
        'spamhereplease.com', 'streetwisemail.com', 'suremail.info', 'thisisnotmyrealemail.com',
        'tradermail.info', 'veryrealemail.com', 'zippymail.info', 'zoemail.org'
    ]
    all_domains.update(core_disposable)

    sorted_list = sorted(list(all_domains))
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(sorted_list, f, indent=2)

    print(f"Saved {len(sorted_list)} unique threat/disposable domains to {OUTPUT_FILE}")
    return len(sorted_list)

if __name__ == '__main__':
    count = sync_feeds()
    print(f"Complete: Threat Intelligence database updated with {count} domains.")
