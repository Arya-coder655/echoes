import assert from 'node:assert';
import {
  initDatabase,
  addComment,
  toggleCommentReaction,
  toggleCommentCandle,
  reportComment,
  getCommentsForEcho,
  getAdminCommentsWithReports,
  dismissCommentReports,
  toggleCommentVisibility,
  deleteCommentPermanently,
  createEcho,
  registerOrVerifyIdentity
} from '../server/db.js';

async function run() {
  console.log('🧪 Testing Advanced Comment Backend APIs...');
  await initDatabase();

  const userA = { id: `test_author_${Date.now()}`, secret: 'a'.repeat(32) };
  const userB = { id: `test_reactor_${Date.now()}`, secret: 'b'.repeat(32) };

  await registerOrVerifyIdentity(userA.id, userA.secret);
  await registerOrVerifyIdentity(userB.id, userB.secret);

  // 1. Create a test echo
  const echoId = `test_echo_${Date.now()}`;
  await createEcho({
    id: echoId,
    name: 'To: The Stars',
    category: 'Regret Wall',
    message: 'Testing comment transformation engine.',
    themeId: 'amber-nostalgia',
    authorId: userA.id
  });
  console.log('✓ Created test echo:', echoId);

  // 2. Add root comment with GIF
  const c1 = await addComment(
    echoId,
    'This is a root reflection with warmth.',
    userA.id,
    null,
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZhcW13NXl6YmtvdXNveHprcXB3NmtyeGRjZ2phYTY3OHJ5eDltNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/od5H3PmEG5EVq/giphy.gif',
    true // isWarmth
  );
  assert.ok(c1.id, 'Comment 1 must have ID');
  assert.strictEqual(c1.isWarmth, true, 'Comment 1 isWarmth must be true');
  console.log('✓ Added comment with GIF & isWarmth:', c1.id);

  // 3. Add nested reply to c1
  const c2 = await addComment(echoId, 'This is a reply to root comment.', userB.id, c1.id);
  assert.strictEqual(c2.parentId, c1.id, 'Comment 2 parentId must match c1');
  console.log('✓ Added nested reply:', c2.id);

  // 4. Test Reaction - User B reacts with 'hug' to c1
  const rx1 = await toggleCommentReaction(c1.id, userB.id, 'hug');
  assert.strictEqual(rx1.action, 'added', 'Reaction should be added');
  assert.strictEqual(rx1.userReaction, 'hug', 'Reaction type should be hug');
  assert.strictEqual(rx1.reactionsCount, 1, 'Total reaction count should be 1');
  assert.strictEqual(rx1.breakdown.hug, 1, 'Breakdown should show 1 hug');
  console.log('✓ Added hug reaction');

  // 5. Change Reaction - User B switches to 'heart'
  const rx2 = await toggleCommentReaction(c1.id, userB.id, 'heart');
  assert.strictEqual(rx2.action, 'changed', 'Reaction should be changed');
  assert.strictEqual(rx2.userReaction, 'heart');
  assert.strictEqual(rx2.breakdown.heart, 1);
  assert.strictEqual(rx2.breakdown.hug, undefined);
  console.log('✓ Changed reaction from hug to heart');

  // 6. Test Candle - User B lights candle for c1
  const candle1 = await toggleCommentCandle(c1.id, userB.id);
  assert.strictEqual(candle1.candleLit, true, 'Candle should be lit');
  assert.strictEqual(candle1.candleCount, 1, 'Candle count should be 1');
  console.log('✓ Lit candle on comment');

  // 7. Test getCommentsForEcho
  const comments = await getCommentsForEcho(echoId, 'relevance', userB.id);
  assert.strictEqual(comments.length, 2, 'Should return 2 comments');
  const enrichedC1 = comments.find(c => c.id === c1.id);
  assert.strictEqual(enrichedC1.userReaction, 'heart', 'User B reaction should be detected');
  assert.strictEqual(enrichedC1.userCandleLit, true, 'User B candle should be detected');
  assert.strictEqual(enrichedC1.reactionsCount, 1);
  assert.strictEqual(enrichedC1.candleCount, 1);
  console.log('✓ getCommentsForEcho returned enriched reaction & candle data');

  // 8. Test reporting comment
  const rep = await reportComment(c2.id, echoId, userA.id, 'Inappropriate or offensive content', 'Testing report');
  assert.strictEqual(rep.success, true);
  console.log('✓ Reported comment');

  // 9. Admin view reports
  const adminComments = await getAdminCommentsWithReports('reported');
  const reportedC2 = adminComments.find(c => c.id === c2.id);
  assert.ok(reportedC2, 'Reported comment should appear in admin query');
  assert.strictEqual(reportedC2.reportCount >= 1, true);
  console.log('✓ Admin reports listing verified');

  // 10. Admin dismiss reports & toggle visibility
  await dismissCommentReports(c2.id);
  await toggleCommentVisibility(c2.id, true);
  const hiddenCheck = await getCommentsForEcho(echoId, 'relevance', null);
  assert.strictEqual(hiddenCheck.find(c => c.id === c2.id), undefined, 'Hidden comment should not appear in public query');
  console.log('✓ Dismissed report and verified comment hiding');

  // Cleanup test data
  await deleteCommentPermanently(c1.id);
  await deleteCommentPermanently(c2.id);
  console.log('✓ Cleaned up test comments');

  console.log('\n🎉 ALL ADVANCED COMMENT BACKEND TESTS PASSED!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
