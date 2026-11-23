import assert from 'node:assert';
import {
  initDatabase,
  addComment,
  toggleCommentReaction,
  deleteCommentByOwner,
  getCommentsForEcho,
  createEcho,
  deleteEchoPermanently,
  registerOrVerifyIdentity
} from '../server/db.js';

async function run() {
  console.log('🧪 Starting Comment Deletion & Candle Removal Automated Verification...\n');
  await initDatabase();

  const userA = { id: `del_user_a_${Date.now()}`, secret: 'a'.repeat(32) };
  const userB = { id: `del_user_b_${Date.now()}`, secret: 'b'.repeat(32) };

  await registerOrVerifyIdentity(userA.id, userA.secret);
  await registerOrVerifyIdentity(userB.id, userB.secret);
  console.log('✓ Registered anonymous identities for User A and User B');

  // 1. Create a test echo
  const echoId = `test_echo_del_${Date.now()}`;
  await createEcho({
    id: echoId,
    name: 'To: Verification',
    category: 'Regret Wall',
    message: 'Testing deletion security & candle removal.',
    themeId: 'amber-nostalgia',
    authorId: userA.id
  });
  console.log('✓ Created test echo:', echoId);

  // 2. Add leaf comment by User A
  const c1 = await addComment(echoId, 'Leaf comment by User A', userA.id);
  assert.ok(c1.id, 'Comment 1 must be created');
  console.log('✓ User A posted leaf comment:', c1.id);

  // 3. User B tries to delete User A\'s comment -> must fail with unauthorized
  console.log('Checking unauthorized deletion attempt by User B...');
  const unauthorizedRes = await deleteCommentByOwner(userB.id, c1.id);
  assert.strictEqual(unauthorizedRes.success, false, 'Unauthorized deletion must fail');
  assert.strictEqual(unauthorizedRes.unauthorized, true, 'Result must flag unauthorized: true');
  console.log('✓ Non-owner deletion rejected (403 Forbidden verified):', unauthorizedRes.error);

  // 4. User A deletes own leaf comment -> must succeed with tombstoned = false
  console.log('Checking authorized leaf comment deletion by User A...');
  const authorizedLeafRes = await deleteCommentByOwner(userA.id, c1.id);
  assert.strictEqual(authorizedLeafRes.success, true, 'Owner leaf deletion must succeed');
  assert.strictEqual(authorizedLeafRes.tombstoned, false, 'Leaf comment must be fully deleted, not tombstoned');
  console.log('✓ User A successfully deleted leaf comment completely');

  // Verify c1 is gone
  const commentsAfterLeaf = await getCommentsForEcho(echoId, 'newest', userA.id);
  assert.strictEqual(commentsAfterLeaf.some(c => c.id === c1.id), false, 'Comment 1 must no longer exist');
  console.log('✓ Verified comment 1 is removed from feed');

  // 5. Test Thread Deletion (Parent with replies)
  // Create parent comment C2 by User A
  const c2 = await addComment(echoId, 'Parent conversation thread by User A', userA.id);
  console.log('✓ User A posted parent comment:', c2.id);

  // User B posts reply C3 to C2
  const c3 = await addComment(echoId, 'Child reply by User B', userB.id, c2.id);
  console.log('✓ User B posted child reply:', c3.id);

  // User B reacts to C2 with "hug"
  const rxRes = await toggleCommentReaction(c2.id, userB.id, 'hug');
  assert.strictEqual(rxRes.action, 'added', 'Reaction should be added');
  console.log('✓ User B added hug reaction to C2');

  // User A deletes parent comment C2 (which has reply C3)
  console.log('User A deleting parent comment C2 with replies...');
  const parentDelRes = await deleteCommentByOwner(userA.id, c2.id);
  assert.strictEqual(parentDelRes.success, true, 'Owner parent deletion must succeed');
  assert.strictEqual(parentDelRes.tombstoned, true, 'Parent with replies must be tombstoned');
  console.log('✓ Parent comment tombstoned cleanly to preserve nested thread');

  // Inspect comments for echo: C2 should be tombstoned, C3 intact
  const commentsAfterTombstone = await getCommentsForEcho(echoId, 'newest', userA.id);
  const tombstonedC2 = commentsAfterTombstone.find(c => c.id === c2.id);
  const intactC3 = commentsAfterTombstone.find(c => c.id === c3.id);

  assert.ok(tombstonedC2, 'Tombstoned parent C2 must still be returned in comments');
  assert.strictEqual(tombstonedC2.isDeleted, true, 'isDeleted must be true');
  assert.strictEqual(tombstonedC2.text, '[This reflection was deleted by its author.]', 'Tombstone text verified');
  assert.strictEqual(tombstonedC2.isOwn, false, 'Tombstoned comment cannot be owned');
  assert.strictEqual(tombstonedC2.reactionsCount, 0, 'Reactions cleared from tombstoned comment');

  assert.ok(intactC3, 'Child reply C3 must still exist');
  assert.strictEqual(intactC3.parentId, c2.id, 'Child reply C3 parentId must still point to C2');
  console.log('✓ Conversation thread structure verified: parent tombstoned, child reply intact');

  // 6. Verify 7 Emotional Reactions (Candle Removed)
  console.log('Verifying 7 Emotional Reactions (Candle completely removed)...');
  const validReactions = ['heart', 'hug', 'moved', 'hope', 'peace', 'powerful', 'gratitude'];
  for (const rx of validReactions) {
    const r = await toggleCommentReaction(c3.id, userA.id, rx);
    assert.strictEqual(r.userReaction, rx, `Reaction ${rx} should work`);
    // toggle off
    await toggleCommentReaction(c3.id, userA.id, rx);
  }
  console.log('✓ Verified all 7 emotional reactions work cleanly (❤️, 🫂, 🥺, ✨, 🤍, 🔥, 🙏)');

  // 7. Verify Candle absence in enriched comment object
  const commentsFeed = await getCommentsForEcho(echoId, 'relevance', userA.id);
  for (const c of commentsFeed) {
    assert.strictEqual(c.candleCount, undefined, 'candleCount must not exist on comment');
    assert.strictEqual(c.userCandleLit, undefined, 'userCandleLit must not exist on comment');
  }
  console.log('✓ Verified candleCount & userCandleLit are completely eliminated from response');

  // 8. Clean up test echo
  await deleteEchoPermanently(echoId);
  console.log('✓ Cleaned up test echo:', echoId);

  console.log('\n🎉 ALL COMMENT DELETION & CANDLE REMOVAL TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
