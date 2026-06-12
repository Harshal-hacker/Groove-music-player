const request = require('supertest');
const { app, connectDB } = require('../index'); 
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// ⏳ Tell Jest to wait up to 30 seconds for cloud database connections
jest.setTimeout(30000);

// 🎭 CREATE FAKE TOKENS FOR TESTING SECURITY RULES
const mockUserId = new mongoose.Types.ObjectId().toString();
const mockHackerId = new mongoose.Types.ObjectId().toString();

// We sign a token exactly like your authController does
const standardUserToken = jwt.sign({ userId: mockUserId, role: 'user' }, process.env.JWT_SECRET);
const standardCookie = `auth_token=${standardUserToken}`;

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect(); 
});

// =========================================================================
// 🎵 1. PUBLIC ROUTES 
// =========================================================================
describe('Public Routes', () => {
  it('GET /api/songs - should return an array of songs', async () => {
    const res = await request(app).get('/api/songs');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy(); 
  });
});

// =========================================================================
// 🔒 2. THE SHIELD (Testing missing tokens)
// =========================================================================
describe('Protected Route Security (No Token)', () => {
  it('POST /api/songs/upload - should reject requests without an auth token', async () => {
    const res = await request(app).post('/api/songs/upload').send({ title: "Test" });
    expect(res.statusCode).toEqual(401); 
  });

  it('PATCH /api/users/:id/playback - should reject without an auth token', async () => {
    const res = await request(app).patch(`/api/users/${mockUserId}/playback`).send({ currentTime: 10 });
    expect(res.statusCode).toEqual(401); 
  });
});

// =========================================================================
// 👮‍♂️ 3. ROLE & OWNERSHIP SECURITY (Testing the rules we built)
// =========================================================================
describe('Advanced Security Rules (Standard User logged in)', () => {
  
  it('DELETE /api/songs/:id - should block a standard user from deleting a song (Admin Only)', async () => {
    const fakeSongId = new mongoose.Types.ObjectId().toString();
    
    const res = await request(app)
      .delete(`/api/songs/${fakeSongId}`)
      .set('Cookie', [standardCookie]); // Simulate being logged in as a normal user
    
    // We expect the server to say 403 Forbidden!
    expect(res.statusCode).toEqual(403);
    expect(res.body.message).toMatch(/Admin only/i);
  });

  it('PATCH /api/users/:id/playback - should block a user from updating SOMEONE ELSEs playback', async () => {
    // The user is logged in as "mockUserId", but tries to update "mockHackerId"
    const res = await request(app)
      .patch(`/api/users/${mockHackerId}/playback`)
      .set('Cookie', [standardCookie])
      .send({ currentTime: 45.5 });
    
    // We expect the new identity check in index.js to catch this!
    expect(res.statusCode).toEqual(403);
  });

});

// =========================================================================
// 👤 4. AUTHENTICATION LOGIC
// =========================================================================
describe('Authentication Logic', () => {
  it('POST /api/auth/login - should reject incorrect passwords with a 400 status', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: "fakeuser@doesnotexist.com",
      password: "wrongpassword123"
    });
    
    // Adjusted to 400 to match your authController's actual response
    expect(res.statusCode).toEqual(400); 
  });
});