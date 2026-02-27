import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // TODO: Implement actual registration logic
    // This should:
    // 1. Check if email already exists
    // 2. Hash the password using bcrypt
    // 3. Create user in database
    // 4. Create session/JWT token
    // 5. Return user data and token

    return NextResponse.json(
      {
        user: {
          id: 'user123',
          email: email,
          name: name,
        },
        token: 'jwt_token_here',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
