import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { AuthorizedUser } from '../services/authorization.service';

interface JWTPayload {
  userId: string;
  role: string;
  branchId?: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthorizedUser;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '') || 
                  request.cookies?.accessToken;

    if (!token) {
      return reply.status(401).send({ 
        error: { message: 'Access token required' } 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    request.user = {
      userId: decoded.userId,
      role: decoded.role as any,
      branchId: decoded.branchId,
    };

  } catch (error) {
    return reply.status(401).send({ 
      error: { message: 'Invalid or expired token' } 
    });
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ 
        error: { message: 'Authentication required' } 
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({ 
        error: { message: 'Insufficient permissions' } 
      });
    }
  };
}