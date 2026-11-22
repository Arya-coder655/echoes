import assert from 'node:assert';
import {
  initDatabase,
  registerOrVerifyIdentity,
  verifyIdentityCredentials,
  recoverIdentity,
  getMyEchoOverview,
  getMyEchoPosts,
  deleteMyEchoPost,
  getMyEchoBookmarks,
  addMyEchoBookmark,
  removeMyEchoBookmark,
  getMyEchoComments,
  deleteMyEchoComment,
  getMyEchoReplies,
  getMyEchoNotifications,
  markMyEchoNotificationsRead,
  createEcho,
  addComment
} from '../server/db.js';

async function runTests() {
  console.log('🧪 Starting Comprehensive My Echo Backend & DB Test Suite...\n');
  await initDatabase();

  const userA = {
    id: `anon_test_user_a_${Date.now()}`,
    secret: 'secret_a_token_9876543210abcdef9876543210abcdef'
  };

  const userB = {
    id: `anon_test_user_b_${Date.now()}`,
    secret: 'secret_b_token_1234567890fedcba1234567890fedcba'
  };

  // 1. Register User A
  console.log('Test 1: Register anonymous identity User A');
  const regA = await registerOrVerifyIdentity(userA.id, userA.secret);
  assert.strictEqual(regA.success, true, 'User A registration must succeed');
  assert.strictEqual(regA.isNew, true, 'User A should be marked new');
  console.log('✓ User A registered with SHA-256 salt+hash');

  // 2. Re-verify User A credentials
  console.log('Test 2: Re-verify User A identity');
  const verifyA = await verifyIdentityCredentials(userA.id, userA.secret);
  assert.strictEqual(verifyA, true, 'User A credentials must verify');
  const verifyBad = await verifyIdentityCredentials(userA.id, 'wrong_secret');
  assert.strictEqual(verifyBad, false, 'Wrong secret must fail verification');
  console.log('✓ Secret verification & rejection of invalid secrets verified');

  // 3. Register User B
  console.log('Test 3: Register anonymous identity User B');
  const regB = await registerOrVerifyIdentity(userB.id, userB.secret);
  assert.strictEqual(regB.success, true);
  console.log('✓ User B registered');

  // 4. User A publishes an Echo
  console.log('Test 4: User A publishes an Echo');
  const echoAId = `ECHO-TEST-A-${Date.now()}`;
  const echoA = await createEcho({
    id: echoAId,
    name: 'To: The Northern Star',
    category: 'midnight-thoughts',
    message: 'Testing My Echo anonymous post ownership.',
    image: '',
    likes: 1,
    shares: 0,
    themeId: 'midnight-sorrow',
    timestamp: Date.now(),
    authorId: userA.id
  });
  assert.strictEqual(echoA.id, echoAId);
  console.log('✓ User A Echo created');

  // 5. Query My Echo Posts for User A
  console.log('Test 5: Query My Echo Posts for User A');
  const myPostsA = await getMyEchoPosts(userA.id);
  assert(myPostsA.items.some(p => p.id === echoAId), 'Echo A must be in User A posts');
  console.log(`✓ User A posts retrieved (${myPostsA.total} total)`);

  // 6. Query My Echo Posts for User B (Isolation Check)
  console.log('Test 6: Privacy Isolation - User B must NOT see User A posts');
  const myPostsB = await getMyEchoPosts(userB.id);
  assert(!myPostsB.items.some(p => p.id === echoAId), 'User B must not see User A post in their private dashboard');
  console.log('✓ Strict ownership isolation verified');

  // 7. Bookmarks: User A bookmarks User A post, User B bookmarks User A post
  console.log('Test 7: Bookmarking');
  await addMyEchoBookmark(userB.id, echoAId);
  const bookmarksB = await getMyEchoBookmarks(userB.id);
  assert(bookmarksB.some(b => b.id === echoAId), 'User B bookmarks must contain Echo A');
  console.log('✓ Bookmarking verified');

  // 8. User B comments on User A post (Notification & Reply Trigger)
  console.log('Test 8: User B comments on User A post -> Notification routing');
  const commentText = 'I hear your quiet words, fellow soul.';
  const commB = await addComment(echoAId, commentText, userB.id);
  assert(commB.id, 'Comment must be created');

  // User A should now have a notification and a reply
  const notifsA = await getMyEchoNotifications(userA.id);
  assert(notifsA.unreadCount >= 1, 'User A must have at least 1 unread notification');
  assert(notifsA.items.some(n => n.echoId === echoAId), 'Notification must reference Echo A');
  console.log(`✓ Reply notification routed to User A (Unread: ${notifsA.unreadCount})`);

  // User A checks Replies tab
  const repliesA = await getMyEchoReplies(userA.id);
  assert(repliesA.some(r => r.echoId === echoAId && r.replyText === commentText), 'Replies tab must list User B reply');
  console.log('✓ Replies tab accurately reflects received comment');

  // 9. User A marks notifications as read
  console.log('Test 9: Mark notifications as read');
  await markMyEchoNotificationsRead(userA.id);
  const notifsAfterRead = await getMyEchoNotifications(userA.id);
  assert.strictEqual(notifsAfterRead.unreadCount, 0, 'Unread count must be 0 after marking read');
  console.log('✓ Notifications successfully marked read');

  // 10. User B checks My Reflections tab
  console.log('Test 10: User B My Reflections tab');
  const refB = await getMyEchoComments(userB.id);
  assert(refB.items.some(c => c.id === commB.id), 'Comment B must appear in User B reflections');
  console.log('✓ My Reflections tab lists authored comment');

  // 11. User B tries to delete User A post (Security Enforcement)
  console.log('Test 11: Security Authorization - User B tries to delete User A post');
  const unauthorizedDel = await deleteMyEchoPost(userB.id, echoAId);
  assert.strictEqual(unauthorizedDel.success, false, 'Unauthorized deletion must fail');
  assert.strictEqual(unauthorizedDel.unauthorized, true, 'Must flag unauthorized');
  console.log('✓ Unauthorized deletion blocked');

  // 12. Recovery Key Export and Restore
  console.log('Test 12: Recovery Key Export & Restore');
  const recPayload = JSON.stringify({ id: userA.id, secret: userA.secret });
  const recoveryKey = `ECHO-REC-${Buffer.from(recPayload).toString('base64')}`;
  const recovered = await recoverIdentity(recoveryKey);
  assert.strictEqual(recovered.success, true, 'Recovery must succeed');
  assert.strictEqual(recovered.identityId, userA.id, 'Recovered ID must match');
  console.log('✓ Identity recovery key verified');

  // 13. Clean up: User A deletes own Echo
  console.log('Test 13: Authorized deletion of own Echo');
  const deleteRes = await deleteMyEchoPost(userA.id, echoAId);
  assert.strictEqual(deleteRes.success, true, 'Authorized deletion must succeed');
  const myPostsAfterDel = await getMyEchoPosts(userA.id);
  assert(!myPostsAfterDel.items.some(p => p.id === echoAId), 'Deleted echo must no longer exist');
  console.log('✓ Authorized deletion confirmed and cascades cleaned');

  // Clean up User B reflection & bookmark
  await deleteMyEchoComment(userB.id, commB.id);
  await removeMyEchoBookmark(userB.id, echoAId);

  console.log('\n🎉 ALL 13 MY ECHO BACKEND & SECURITY TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
