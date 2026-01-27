-- Jeff Agent Email Rules Seed Data
-- Migration 005: Populate jeff_email_rules from Gmail filter analysis
-- Run AFTER 004_email_classification.sql
--
-- Source: Gmail filter export from jglittell@gmail.com and jeff@jglcap.com
-- ~130+ sender-based rules for rule-based fast-path classification

-- ============================================================================
-- SPAM (auto_delete)
-- ============================================================================
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, source, priority) VALUES
('Spam - Generic', '%@spam%', 'spam', 'auto_delete', 'gmail_filter', 10),
('Spam - Noreply junk', '%noreply@%', 'spam', 'auto_archive', 'gmail_filter', 90);
-- Note: Most spam is handled by Gmail's built-in filter. Rules here are for edge cases.

-- ============================================================================
-- MARKETING (auto_archive)
-- ============================================================================
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, source, priority) VALUES
('Marketing - Groupon', '%@groupon.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - LivingSocial', '%@livingsocial.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Gilt', '%@gilt.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - JackThreads', '%@jackthreads.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Kayak', '%@kayak.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Hotels.com', '%@hotels.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Expedia', '%@expedia.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - TripAdvisor', '%@tripadvisor.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Travelocity', '%@travelocity.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Orbitz', '%@orbitz.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Priceline', '%@priceline.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Airbnb', '%@airbnb.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Uber', '%@uber.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Lyft', '%@lyft.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - DoorDash', '%@doordash.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Grubhub', '%@grubhub.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Seamless', '%@seamless.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Postmates', '%@postmates.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - LinkedIn', '%@linkedin.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Facebook', '%@facebookmail.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Instagram', '%@instagram.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Twitter/X', '%@x.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Spotify', '%@spotify.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Netflix', '%@netflix.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Hulu', '%@hulu.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Disney+', '%@disneyplus.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Apple', '%@apple.com', 'marketing', 'auto_archive', 'gmail_filter', 20),
('Marketing - Google Store', '%@google.com', 'marketing', 'auto_archive', 'gmail_filter', 25);

-- ============================================================================
-- ORDERS (auto_archive + tag_status)
-- ============================================================================
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, source, priority) VALUES
('Orders - Amazon', '%@amazon.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Amazon Ship', '%ship-confirm@amazon.com', 'orders', 'tag_status', 'gmail_filter', 14),
('Orders - Target', '%@target.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Walmart', '%@walmart.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Best Buy', '%@bestbuy.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Home Depot', '%@homedepot.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Lowes', '%@lowes.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Costco', '%@costco.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Wayfair', '%@wayfair.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - eBay', '%@ebay.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Etsy', '%@etsy.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - UPS', '%@ups.com', 'orders', 'tag_status', 'gmail_filter', 15),
('Orders - FedEx', '%@fedex.com', 'orders', 'tag_status', 'gmail_filter', 15),
('Orders - USPS', '%@usps.com', 'orders', 'tag_status', 'gmail_filter', 15),
('Orders - TradeStation Confirm', '%@tradestation.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Fidelity Confirm', '%@fidelity.com', 'orders', 'auto_archive', 'gmail_filter', 15),
('Orders - Schwab Confirm', '%@schwab.com', 'orders', 'auto_archive', 'gmail_filter', 15);

-- ============================================================================
-- INTEL_CRE (archive_and_index)
-- Commercial Real Estate news, deal alerts, market reports
-- Maps to Gmail label: Articles/CRE
-- ============================================================================
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, source, priority) VALUES
('Intel CRE - CoStar', '%@costar.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Bisnow', '%@bisnow.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - GlobeSt', '%@globest.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Commercial Observer', '%@commercialobserver.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Real Capital Analytics', '%@rcanalytics.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - CBRE', '%@cbre.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - JLL', '%@jll.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Cushman', '%@cushwake.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Marcus Millichap', '%@marcusmillichap.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Newmark', '%@ngkf.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Colliers', '%@colliers.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - CREXi', '%@crexi.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - LoopNet', '%@loopnet.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Real Deal', '%@therealdeal.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - ConnectCRE', '%@connectcre.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Propmodo', '%@propmodo.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - CRE Daily', '%@credaily.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - Multifamily', '%@multifamilyexecutive.com', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - NAIOP', '%@naiop.org', 'intel_cre', 'archive_and_index', 'gmail_filter', 30),
('Intel CRE - ULI', '%@uli.org', 'intel_cre', 'archive_and_index', 'gmail_filter', 30);

-- L7 account CRE sources
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, account, source, priority) VALUES
('Intel CRE L7 - CoStar', '%@costar.com', 'intel_cre', 'archive_and_index', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - Bisnow', '%@bisnow.com', 'intel_cre', 'archive_and_index', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - CBRE', '%@cbre.com', 'intel_cre', 'archive_and_index', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - JLL', '%@jll.com', 'intel_cre', 'archive_and_index', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - Cushman', '%@cushwake.com', 'intel_cre', 'archive_and_index', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - Marcus', '%@marcusmillichap.com', 'intel_cre', 'archive_and_index', 'l7', 'gmail_filter', 30);

-- Subject-based CRE rules (for OM detection on L7)
INSERT INTO jeff_email_rules (rule_name, subject_pattern, classification, suggested_action, account, source, priority) VALUES
('Intel CRE - OM Subject', '%offering memor%', 'intel_cre', 'create_proposal', 'l7', 'gmail_filter', 25),
('Intel CRE - OM Abbrev', '%OM -%', 'intel_cre', 'create_proposal', 'l7', 'gmail_filter', 25),
('Intel CRE - Deal Alert', '%deal alert%', 'intel_cre', 'archive_and_index', 'l7', 'gmail_filter', 28);

-- ============================================================================
-- INTEL_MARKETS (archive_and_index)
-- Financial/trading news, market analysis
-- Maps to Gmail label: Articles/Finance
-- ============================================================================
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, source, priority) VALUES
('Intel Markets - Bloomberg', '%@bloomberg.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - WSJ', '%@wsj.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - CNBC', '%@cnbc.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - Barrons', '%@barrons.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - MarketWatch', '%@marketwatch.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - Seeking Alpha', '%@seekingalpha.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - Morning Brew', '%@morningbrew.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - Finimize', '%@finimize.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - Reuters', '%@reuters.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - Yahoo Finance', '%@yahoo-inc.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - Investopedia', '%@investopedia.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - Motley Fool', '%@fool.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - TradeStation News', '%@tradestation.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 35),
('Intel Markets - Benzinga', '%@benzinga.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30),
('Intel Markets - Unusual Whales', '%@unusualwhales.com', 'intel_markets', 'archive_and_index', 'gmail_filter', 30);

-- ============================================================================
-- INTEL_GENERAL (archive_and_index)
-- Tech, business, general knowledge newsletters
-- Maps to Gmail label: Articles (generic)
-- ============================================================================
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, source, priority) VALUES
('Intel General - HBR', '%@hbr.org', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - Stratechery', '%@stratechery.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - TLDR', '%@tldrnewsletter.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - Hacker News', '%@ycombinator.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - TechCrunch', '%@techcrunch.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - The Verge', '%@theverge.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - Ars Technica', '%@arstechnica.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - MIT Tech Review', '%@technologyreview.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - Wired', '%@wired.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - Axios', '%@axios.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - The Information', '%@theinformation.com', 'intel_general', 'archive_and_index', 'gmail_filter', 35),
('Intel General - Substack', '%@substack.com', 'intel_general', 'archive_and_index', 'gmail_filter', 40),
('Intel General - Medium', '%@medium.com', 'intel_general', 'archive_and_index', 'gmail_filter', 40),
('Intel General - Newsletter', '%newsletter%', 'intel_general', 'archive_and_index', 'gmail_filter', 50);

-- ============================================================================
-- LOCAL (auto_archive)
-- Darien community, schools, sports, church, local news
-- Maps to Gmail label: Darien/*
-- ============================================================================
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, source, priority) VALUES
('Local - Darien Schools', '%@darienps.org', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Schools 2', '%@darien.k12.ct.us', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Darien YMCA', '%@darien-ymca.org', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Library', '%@darienlibrary.org', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Sports', '%@dariensportshop.com', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Town of Darien', '%@darienct.gov', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Times', '%@darientimes.com', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Patch', '%patch.com', 'local', 'auto_archive', 'gmail_filter', 35),
('Local - St Thomas More', '%@stmdarien.org', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Noroton Presbyterian', '%@norotonchurch.org', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - DAA', '%@darienaa.org', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - DCA', '%@dariendca.org', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Nature Center', '%@dariennaturecenter.org', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Royle School', '%@royle%', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Hindley School', '%@hindley%', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - Middlesex School', '%@middlesex%', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - DHS', '%@darienhighschool%', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - CT News', '%@ctpost.com', 'local', 'auto_archive', 'gmail_filter', 35),
('Local - Stamford Advocate', '%@stamfordadvocate.com', 'local', 'auto_archive', 'gmail_filter', 35),
('Local - Greenwich Time', '%@greenwichtime.com', 'local', 'auto_archive', 'gmail_filter', 35),
('Local - Nextdoor', '%@nextdoor.com', 'local', 'auto_archive', 'gmail_filter', 30),
('Local - SignUpGenius', '%@signupgenius.com', 'local', 'auto_archive', 'gmail_filter', 30);

-- ============================================================================
-- FYI (auto_archive)
-- Informational but not intel - service alerts, notifications
-- ============================================================================
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, source, priority) VALUES
('FYI - GitHub', '%@github.com', 'fyi', 'auto_archive', 'gmail_filter', 40),
('FYI - Cloudflare', '%@cloudflare.com', 'fyi', 'auto_archive', 'gmail_filter', 40),
('FYI - Google Cloud', '%@google.com', 'fyi', 'auto_archive', 'gmail_filter', 45),
('FYI - Supabase', '%@supabase.io', 'fyi', 'auto_archive', 'gmail_filter', 40),
('FYI - Vercel', '%@vercel.com', 'fyi', 'auto_archive', 'gmail_filter', 40),
('FYI - Anthropic', '%@anthropic.com', 'fyi', 'read', 'gmail_filter', 40),
('FYI - OpenAI', '%@openai.com', 'fyi', 'read', 'gmail_filter', 40),
('FYI - Stripe', '%@stripe.com', 'fyi', 'auto_archive', 'gmail_filter', 40),
('FYI - AWS', '%@amazon.com%aws%', 'fyi', 'auto_archive', 'gmail_filter', 40),
('FYI - Slack', '%@slack.com', 'fyi', 'auto_archive', 'gmail_filter', 40),
('FYI - Notion', '%@notion.so', 'fyi', 'auto_archive', 'gmail_filter', 40),
('FYI - Calendly', '%@calendly.com', 'fyi', 'auto_archive', 'gmail_filter', 40);

-- ============================================================================
-- ACCOUNTANT / BANKING (fyi - financial statements, not intel)
-- Maps to Gmail label: Accountant/*
-- ============================================================================
INSERT INTO jeff_email_rules (rule_name, sender_pattern, classification, suggested_action, source, priority) VALUES
('FYI Banking - Chase', '%@chase.com', 'fyi', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - BofA', '%@bankofamerica.com', 'fyi', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Citi', '%@citi.com', 'fyi', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Wells Fargo', '%@wellsfargo.com', 'fyi', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Capital One', '%@capitalone.com', 'fyi', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Amex', '%@americanexpress.com', 'fyi', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Venmo', '%@venmo.com', 'fyi', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - PayPal', '%@paypal.com', 'fyi', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Zelle', '%@zellepay.com', 'fyi', 'auto_archive', 'gmail_filter', 30);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT classification, count(*) as rule_count
FROM jeff_email_rules
WHERE is_active = true
GROUP BY classification
ORDER BY rule_count DESC;
