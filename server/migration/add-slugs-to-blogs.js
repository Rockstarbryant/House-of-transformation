const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function generateSlugsForExistingBlogs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find blogs without slugs
    const blogsWithoutSlugs = await Blog.find({ slug: { $exists: false } });
    console.log(`\n📊 Found ${blogsWithoutSlugs.length} blogs without slugs\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const blog of blogsWithoutSlugs) {
      try {
        // Generate slug
        const baseSlug = blog.title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 60);

        // Check for duplicates
        let slug = baseSlug;
        let counter = 1;
        while (await Blog.findOne({ slug, _id: { $ne: blog._id } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // FIX 1: Handle missing authorRole
        if (!blog.authorRole) {
          blog.authorRole = 'member'; // Default to member
          console.log(`⚠️  Blog "${blog.title}" missing authorRole - defaulting to "member"`);
        }

        // FIX 2: Map invalid categories to valid ones
        const validCategories = ['testimonies', 'events', 'teaching', 'news'];
        const categoryMapping = {
          'outreach': 'events',
          'announcement': 'news',
          'update': 'news',
          'sermon': 'teaching',
          'ministry': 'events'
        };

        if (blog.category && !validCategories.includes(blog.category.toLowerCase())) {
          const oldCategory = blog.category;
          const mappedCategory = categoryMapping[blog.category.toLowerCase()] || 'news';
          blog.category = mappedCategory;
          console.log(`⚠️  Blog "${blog.title}" has invalid category "${oldCategory}" - mapping to "${mappedCategory}"`);
        }

        // Set slug
        blog.slug = slug;

        // Save with validation bypassed for this migration
        await blog.save({ validateBeforeSave: true });
        
        successCount++;
        console.log(`✅ [${successCount}/${blogsWithoutSlugs.length}] Generated slug for "${blog.title}": ${slug}`);
      } catch (error) {
        errorCount++;
        errors.push({
          title: blog.title,
          id: blog._id,
          error: error.message
        });
        console.error(`❌ Failed to process "${blog.title}": ${error.message}`);
      }
    }

    console.log('\n=====================================');
    console.log('📊 MIGRATION SUMMARY');
    console.log('=====================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log('=====================================\n');

    if (errors.length > 0) {
      console.log('⚠️  ERRORS DETAILS:');
      errors.forEach((err, index) => {
        console.log(`\n${index + 1}. Blog: "${err.title}"`);
        console.log(`   ID: ${err.id}`);
        console.log(`   Error: ${err.error}`);
      });
      console.log('\n');
    }

    if (successCount > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('\n📝 Next Steps:');
      console.log('1. Verify slugs in MongoDB:');
      console.log('   mongo your-db-name');
      console.log('   > db.blogs.find({}, { title: 1, slug: 1, category: 1, authorRole: 1 })');
      console.log('\n2. Test in your app:');
      console.log('   - Visit /blog/[slug] URLs');
      console.log('   - Ensure old /blog/[id] URLs still work');
      console.log('\n');
    }

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

generateSlugsForExistingBlogs();