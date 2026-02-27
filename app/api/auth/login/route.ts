import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // TODO: Implement actual authentication logic
    // This should:
    // 1. Hash the password using bcrypt
    // 2. Check against database
    // 3. Create session/JWT token
    // 4. Return user data and token

    // Field must be `accessToken` — AuthContext reads res.accessToken
    return NextResponse.json({
      user: {
        id: 'user123',
        email: email,
        name: 'User Name',
      },
      accessToken: 'jwt_token_here',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
