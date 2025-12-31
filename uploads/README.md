
#mongodb+srv://<db_username>:<db_password>@cluster0.f9tnzom.mongodb.net/?appName=Cluster0

# In server directory
node

# Then paste this code:
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://churchadmin:QMcvRgMSh4UJJc7A@churchcluster.cdjqgbl.mongodb.net/?appName=ChurchCluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);
  
  const admin = await User.create({
    name: 'Church Administrator',
    email: 'admin@houseoftransformation.or.ke',
    password: hashedPassword,
    role: 'admin'
  });
  
  console.log('Admin created:', admin);
  process.exit();
}

createAdmin();


#Now login with:

Email: admin@houseoftransformation.or.ke
Password: admin123