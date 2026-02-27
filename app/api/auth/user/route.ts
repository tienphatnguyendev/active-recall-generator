import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Verify JWT token and fetch user from database
    // This should:
    // 1. Verify the JWT token
    // 2. Get user from database
    // 3. Return user data

    return NextResponse.json({
      user: {
        id: 'user123',
        email: 'user@example.com',
        name: 'User Name',
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, email } = await request.json();

    // TODO: Update user in database
    // This should:
    // 1. Verify JWT token
    // 2. Validate new email uniqueness if changed
    // 3. Update user in database
    // 4. Return updated user data

    return NextResponse.json({
      user: {
        id: 'user123',
        email: email,
        name: name,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
