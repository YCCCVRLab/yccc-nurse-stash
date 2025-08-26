# YCCC Nursing Inventory System

A comprehensive inventory management system for York County Community College's nursing program, built for collaborative inventory management by nursing staff.

## 🚀 Live Application

**Production URL**: https://ycccvrlab.github.io/yccc-nurse-stash/

## ✨ Features

- **Collaborative Inventory Management**: Any authenticated user can edit/delete items added by others
- **Secure Authentication**: Restricted to @mainecc.edu email addresses
- **Advanced Filtering & Search**: Filter by location, stock level, and search across all fields
- **Undo/Redo Functionality**: Track and reverse inventory actions
- **Debug Tools**: Built-in diagnostics for troubleshooting permissions and database issues
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Changes are reflected immediately across all users

## 🔐 Access & Security

- **Authentication Required**: Sign in with your @mainecc.edu email address
- **Email Verification**: Your email must be confirmed to access the system
- **Whitelisted Domains**: Only YCCC staff can access the inventory
- **Audit Logging**: All actions are logged for security and compliance

## 🛠 Technologies Used

- **Frontend**: React, TypeScript, Vite
- **UI Framework**: shadcn/ui with Tailwind CSS
- **Backend**: Supabase (PostgreSQL database with Row Level Security)
- **Authentication**: Supabase Auth with email verification
- **Deployment**: GitHub Pages with automated CI/CD

## 🏥 For Nursing Staff

### Getting Started
1. Navigate to the live application URL above
2. Click "Sign In" and use your @mainecc.edu email address
3. Check your email for verification link
4. Once verified, you can view and manage inventory

### Managing Inventory
- **Add Items**: Click "Add Item" button (requires sign-in)
- **Edit Items**: Click "Edit" on any item card
- **Delete Items**: Click "Delete" on any item card
- **Search**: Use the search bar to find specific items
- **Filter**: Filter by location or stock level using the dropdown menus
- **Undo/Redo**: Use the Undo/Redo buttons to reverse recent actions

### Troubleshooting
If you experience issues with editing or deleting items:
1. Ensure you're signed in with your @mainecc.edu email
2. Verify your email is confirmed (check your inbox)
3. Use the "Debug" button to run system diagnostics
4. Contact IT support if problems persist

## 🔧 Development

### Local Development Setup
```bash
# Clone the repository
git clone https://github.com/YCCCVRLab/yccc-nurse-stash.git
cd yccc-nurse-stash

# Install dependencies
npm install

# Start development server
npm run dev
```

### Database Migrations
The project includes Supabase migrations in `/supabase/migrations/`:
- `001_enhanced_security.sql`: Initial security setup with RLS policies
- `20250826154500_repopulate_inventory.sql`: CSV data import
- `20250826155000_shared_inventory_access.sql`: Shared access permissions

### Environment Variables
Create a `.env` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📝 Database Schema

The inventory system uses a PostgreSQL database with the following main table:

```sql
inventory_items (
  id: UUID (Primary Key)
  item: TEXT (Item name)
  description: TEXT (Optional description)
  location: TEXT (Storage location)
  shelf_drawer: TEXT (Specific shelf/drawer)
  tub_number: TEXT (Container number)
  quantity: TEXT (Current quantity)
  user_id: UUID (User who added the item)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
)
```

## 🚀 Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment process:

1. GitHub Actions builds the React application
2. Deploys to GitHub Pages
3. Updates are live within minutes

## 📞 Support

For technical support or access issues, contact:
- **IT Support**: john.barr@mainecc.edu
- **GitHub Issues**: Use the Issues tab in this repository

## 📄 License

This project is developed for York County Community College's internal use.