-- Jeff Agent Email Rules Seed Data
-- Migration 005: Add classification columns to existing jeff_email_rules, then populate
-- Run AFTER 004_email_classification.sql
--
-- Existing table has: name, sender_pattern, subject_pattern, action, priority (text),
--   apply_to_account, active, keyword_patterns, from_domain, tags, etc.
-- We need to ADD: classification, suggested_action, confidence, source columns

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLE
-- ============================================================================

ALTER TABLE jeff_email_rules
ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN (
  'spam', 'marketing', 'orders',
  'intel_cre', 'intel_markets', 'intel_general',
  'local', 'fyi', 'needs_response', 'urgent'
)),
ADD COLUMN IF NOT EXISTS suggested_action TEXT CHECK (suggested_action IN (
  'auto_delete', 'auto_archive', 'archive_and_index', 'tag_status',
  'read', 'reply', 'create_task', 'create_proposal', 'suggest_draft',
  'notify', 'escalate'
)),
ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0.95,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'gmail_filter',
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 100;

-- ============================================================================
-- 2. UPDATE EXISTING 10 RULES WITH CLASSIFICATIONS
-- ============================================================================
-- Map existing action values to new classification/suggested_action
UPDATE jeff_email_rules SET
  classification = CASE action
    WHEN 'auto_archive' THEN 'spam'
    WHEN 'auto_low_priority' THEN 'marketing'
    WHEN 'auto_urgent' THEN 'urgent'
    WHEN 'auto_high' THEN 'needs_response'
    WHEN 'skip_inbox' THEN 'spam'
    WHEN 'suggest_unsubscribe' THEN 'marketing'
    WHEN 'auto_categorize' THEN 'fyi'
    ELSE 'fyi'
  END,
  suggested_action = CASE action
    WHEN 'auto_archive' THEN 'auto_archive'
    WHEN 'auto_low_priority' THEN 'auto_archive'
    WHEN 'auto_urgent' THEN 'notify'
    WHEN 'auto_high' THEN 'reply'
    WHEN 'skip_inbox' THEN 'auto_delete'
    WHEN 'suggest_unsubscribe' THEN 'auto_archive'
    WHEN 'auto_categorize' THEN 'auto_archive'
    ELSE 'auto_archive'
  END
WHERE classification IS NULL;

-- ============================================================================
-- 3. SEED NEW RULES
-- ============================================================================
-- Using actual table columns: name, sender_pattern, subject_pattern, classification,
-- suggested_action, apply_to_account, source, sort_order, action (legacy)

-- MARKETING
INSERT INTO jeff_email_rules (name, sender_pattern, classification, suggested_action, action, source, sort_order) VALUES
('Marketing - Groupon', '%@groupon.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - LivingSocial', '%@livingsocial.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Gilt', '%@gilt.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - JackThreads', '%@jackthreads.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Kayak', '%@kayak.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Hotels.com', '%@hotels.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Expedia', '%@expedia.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - TripAdvisor', '%@tripadvisor.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Travelocity', '%@travelocity.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Orbitz', '%@orbitz.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Priceline', '%@priceline.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Airbnb', '%@airbnb.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Uber', '%@uber.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Lyft', '%@lyft.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - DoorDash', '%@doordash.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Grubhub', '%@grubhub.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Seamless', '%@seamless.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Postmates', '%@postmates.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - LinkedIn', '%@linkedin.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Facebook', '%@facebookmail.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Instagram', '%@instagram.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Twitter/X', '%@x.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Spotify', '%@spotify.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Netflix', '%@netflix.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Hulu', '%@hulu.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Disney+', '%@disneyplus.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Apple', '%@apple.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 20),
('Marketing - Google Store', '%@google.com', 'marketing', 'auto_archive', 'auto_archive', 'gmail_filter', 25);

-- ORDERS
INSERT INTO jeff_email_rules (name, sender_pattern, classification, suggested_action, action, source, sort_order) VALUES
('Orders - Amazon', '%@amazon.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Amazon Ship', '%ship-confirm@amazon.com', 'orders', 'tag_status', 'auto_categorize', 'gmail_filter', 14),
('Orders - Target', '%@target.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Walmart', '%@walmart.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Best Buy', '%@bestbuy.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Home Depot', '%@homedepot.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Lowes', '%@lowes.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Costco', '%@costco.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Wayfair', '%@wayfair.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - eBay', '%@ebay.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Etsy', '%@etsy.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - UPS', '%@ups.com', 'orders', 'tag_status', 'auto_categorize', 'gmail_filter', 15),
('Orders - FedEx', '%@fedex.com', 'orders', 'tag_status', 'auto_categorize', 'gmail_filter', 15),
('Orders - USPS', '%@usps.com', 'orders', 'tag_status', 'auto_categorize', 'gmail_filter', 15),
('Orders - TradeStation Confirm', '%@tradestation.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Fidelity Confirm', '%@fidelity.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15),
('Orders - Schwab Confirm', '%@schwab.com', 'orders', 'auto_archive', 'auto_archive', 'gmail_filter', 15);

-- INTEL_CRE
INSERT INTO jeff_email_rules (name, sender_pattern, classification, suggested_action, action, source, sort_order) VALUES
('Intel CRE - CoStar', '%@costar.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Bisnow', '%@bisnow.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - GlobeSt', '%@globest.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Commercial Observer', '%@commercialobserver.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Real Capital Analytics', '%@rcanalytics.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - CBRE', '%@cbre.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - JLL', '%@jll.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Cushman', '%@cushwake.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Marcus Millichap', '%@marcusmillichap.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Newmark', '%@ngkf.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Colliers', '%@colliers.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - CREXi', '%@crexi.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - LoopNet', '%@loopnet.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Real Deal', '%@therealdeal.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - ConnectCRE', '%@connectcre.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Propmodo', '%@propmodo.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - CRE Daily', '%@credaily.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - Multifamily', '%@multifamilyexecutive.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - NAIOP', '%@naiop.org', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel CRE - ULI', '%@uli.org', 'intel_cre', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30);

-- INTEL_CRE (L7 account)
INSERT INTO jeff_email_rules (name, sender_pattern, classification, suggested_action, action, apply_to_account, source, sort_order) VALUES
('Intel CRE L7 - CoStar', '%@costar.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - Bisnow', '%@bisnow.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - CBRE', '%@cbre.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - JLL', '%@jll.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - Cushman', '%@cushwake.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'l7', 'gmail_filter', 30),
('Intel CRE L7 - Marcus', '%@marcusmillichap.com', 'intel_cre', 'archive_and_index', 'auto_categorize', 'l7', 'gmail_filter', 30);

-- Subject-based CRE rules (OM detection on L7)
INSERT INTO jeff_email_rules (name, subject_pattern, classification, suggested_action, action, apply_to_account, source, sort_order) VALUES
('Intel CRE - OM Subject', '%offering memor%', 'intel_cre', 'create_proposal', 'auto_high', 'l7', 'gmail_filter', 25),
('Intel CRE - OM Abbrev', '%OM -%', 'intel_cre', 'create_proposal', 'auto_high', 'l7', 'gmail_filter', 25),
('Intel CRE - Deal Alert', '%deal alert%', 'intel_cre', 'archive_and_index', 'auto_categorize', 'l7', 'gmail_filter', 28);

-- INTEL_MARKETS
INSERT INTO jeff_email_rules (name, sender_pattern, classification, suggested_action, action, source, sort_order) VALUES
('Intel Markets - Bloomberg', '%@bloomberg.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - WSJ', '%@wsj.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - CNBC', '%@cnbc.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - Barrons', '%@barrons.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - MarketWatch', '%@marketwatch.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - Seeking Alpha', '%@seekingalpha.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - Morning Brew', '%@morningbrew.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - Finimize', '%@finimize.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - Reuters', '%@reuters.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - Yahoo Finance', '%@yahoo-inc.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - Investopedia', '%@investopedia.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - Motley Fool', '%@fool.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - TradeStation News', '%@tradestation.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel Markets - Benzinga', '%@benzinga.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30),
('Intel Markets - Unusual Whales', '%@unusualwhales.com', 'intel_markets', 'archive_and_index', 'auto_categorize', 'gmail_filter', 30);

-- INTEL_GENERAL
INSERT INTO jeff_email_rules (name, sender_pattern, classification, suggested_action, action, source, sort_order) VALUES
('Intel General - HBR', '%@hbr.org', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - Stratechery', '%@stratechery.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - TLDR', '%@tldrnewsletter.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - Hacker News', '%@ycombinator.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - TechCrunch', '%@techcrunch.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - The Verge', '%@theverge.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - Ars Technica', '%@arstechnica.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - MIT Tech Review', '%@technologyreview.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - Wired', '%@wired.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - Axios', '%@axios.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - The Information', '%@theinformation.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 35),
('Intel General - Substack', '%@substack.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 40),
('Intel General - Medium', '%@medium.com', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 40),
('Intel General - Newsletter', '%newsletter%', 'intel_general', 'archive_and_index', 'auto_categorize', 'gmail_filter', 50);

-- LOCAL
INSERT INTO jeff_email_rules (name, sender_pattern, classification, suggested_action, action, source, sort_order) VALUES
('Local - Darien Schools', '%@darienps.org', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Schools 2', '%@darien.k12.ct.us', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Darien YMCA', '%@darien-ymca.org', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Library', '%@darienlibrary.org', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Sports', '%@dariensportshop.com', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Town of Darien', '%@darienct.gov', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Times', '%@darientimes.com', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Patch', '%patch.com', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 35),
('Local - St Thomas More', '%@stmdarien.org', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Noroton Presbyterian', '%@norotonchurch.org', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - DAA', '%@darienaa.org', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - DCA', '%@dariendca.org', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Darien Nature Center', '%@dariennaturecenter.org', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Royle School', '%@royle%', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Hindley School', '%@hindley%', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - Middlesex School', '%@middlesex%', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - DHS', '%@darienhighschool%', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - CT News', '%@ctpost.com', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 35),
('Local - Stamford Advocate', '%@stamfordadvocate.com', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 35),
('Local - Greenwich Time', '%@greenwichtime.com', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 35),
('Local - Nextdoor', '%@nextdoor.com', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('Local - SignUpGenius', '%@signupgenius.com', 'local', 'auto_archive', 'auto_archive', 'gmail_filter', 30);

-- FYI (service notifications)
INSERT INTO jeff_email_rules (name, sender_pattern, classification, suggested_action, action, source, sort_order) VALUES
('FYI - GitHub', '%@github.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 40),
('FYI - Cloudflare', '%@cloudflare.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 40),
('FYI - Google Cloud', '%@google.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 45),
('FYI - Supabase', '%@supabase.io', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 40),
('FYI - Vercel', '%@vercel.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 40),
('FYI - Anthropic', '%@anthropic.com', 'fyi', 'read', 'auto_categorize', 'gmail_filter', 40),
('FYI - OpenAI', '%@openai.com', 'fyi', 'read', 'auto_categorize', 'gmail_filter', 40),
('FYI - Stripe', '%@stripe.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 40),
('FYI - Slack', '%@slack.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 40),
('FYI - Notion', '%@notion.so', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 40),
('FYI - Calendly', '%@calendly.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 40);

-- FYI (banking/finance statements)
INSERT INTO jeff_email_rules (name, sender_pattern, classification, suggested_action, action, source, sort_order) VALUES
('FYI Banking - Chase', '%@chase.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - BofA', '%@bankofamerica.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Citi', '%@citi.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Wells Fargo', '%@wellsfargo.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Capital One', '%@capitalone.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Amex', '%@americanexpress.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Venmo', '%@venmo.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - PayPal', '%@paypal.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 30),
('FYI Banking - Zelle', '%@zellepay.com', 'fyi', 'auto_archive', 'auto_archive', 'gmail_filter', 30);

-- ============================================================================
-- 4. UPDATE apply_email_rules FUNCTION for new column names
-- ============================================================================
-- The function needs to query classification/suggested_action from the rules table
-- (replacing the old version that used different column names)

CREATE OR REPLACE FUNCTION apply_email_rules(
  p_thread_id UUID,
  p_sender_email TEXT,
  p_subject TEXT,
  p_account TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_rule RECORD;
  v_result JSONB;
BEGIN
  -- Find first matching rule (ordered by sort_order)
  SELECT * INTO v_rule
  FROM jeff_email_rules
  WHERE active = true
    AND classification IS NOT NULL
    AND (sender_pattern IS NULL OR p_sender_email ILIKE sender_pattern)
    AND (subject_pattern IS NULL OR p_subject ILIKE subject_pattern)
    AND (apply_to_account IS NULL OR apply_to_account = p_account)
    AND (sender_pattern IS NOT NULL OR subject_pattern IS NOT NULL)
  ORDER BY sort_order ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false);
  END IF;

  -- If we have a thread_id, apply via classify_email_thread (updates the thread)
  IF p_thread_id IS NOT NULL THEN
    v_result := classify_email_thread(
      p_thread_id,
      v_rule.classification,
      v_rule.confidence,
      v_rule.suggested_action,
      'rule-based',
      'Matched rule: ' || v_rule.name
    );

    -- Update match count
    UPDATE jeff_email_rules SET
      match_count = COALESCE(match_count, 0) + 1,
      last_matched_at = now()
    WHERE id = v_rule.id;

    RETURN v_result || jsonb_build_object(
      'matched', true,
      'rule_id', v_rule.id,
      'rule_name', v_rule.name
    );
  END IF;

  -- No thread_id: just return the rule match without updating anything
  -- Update match count
  UPDATE jeff_email_rules SET
    match_count = COALESCE(match_count, 0) + 1,
    last_matched_at = now()
  WHERE id = v_rule.id;

  RETURN jsonb_build_object(
    'matched', true,
    'rule_id', v_rule.id,
    'rule_name', v_rule.name,
    'classification', v_rule.classification,
    'confidence', v_rule.confidence,
    'action', v_rule.suggested_action
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT classification, count(*) as rule_count
FROM jeff_email_rules
WHERE active = true AND classification IS NOT NULL
GROUP BY classification
ORDER BY rule_count DESC;
