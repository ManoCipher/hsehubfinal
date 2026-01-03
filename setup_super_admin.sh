#!/bin/bash

# =====================================================
# SETUP ISOLATED SUPER ADMIN - DEPLOYMENT SCRIPT
# =====================================================

echo "🚀 Setting up Isolated Platform Super Admin..."
echo ""

# Navigate to project directory
cd /home/manoj/Documents/Manoj/Projects/FreeLance/Fiverr/Pavel\ Client/hsehubfinal

echo "Step 1: Syncing local migrations with remote database..."
npx supabase db pull

echo ""
echo "Step 2: Applying new migrations (addon system + super admin)..."
npx supabase db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Super Admin Login Credentials:"
echo "   Email: hsehub@admin"
echo "   Password: superadmin@hsehub"
echo "   PIN: 1234567890"
echo ""
echo "🌐 Login URL: http://localhost:8080/auth"
echo ""
echo "📖 For detailed documentation, see:"
echo "   - ISOLATED_SUPER_ADMIN_GUIDE.md"
echo "   - SUPER_ADMIN_TESTING_GUIDE.md"
echo ""
