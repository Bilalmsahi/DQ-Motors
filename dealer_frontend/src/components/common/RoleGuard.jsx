import { useAuth } from '../../context/AuthContext';

/**
 * RoleGuard – renders children only when the current user's role
 * is included in the allowedRoles array.
 *
 * Usage:
 *   <RoleGuard allowedRoles={['ADMIN', 'SALES']}>
 *     <SomeProtectedComponent />
 *   </RoleGuard>
 */
export default function RoleGuard({ allowedRoles = [], children }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) return null;
  return children;
}
