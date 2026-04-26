const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['farmer', 'expert', 'admin'], default: 'farmer' },
  mobile: { type: String },
  gender: { type: String },
  profilePic: { type: String, default: null },
  joinedDate: { type: Date, default: Date.now },
  suspended: { type: Boolean, default: false },
  
  // Address details
  state: { type: String },
  district: { type: String },
  city: { type: String },
  village: { type: String },
  addressLine: { type: String },
  pincode: { type: String },
  country: { type: String, default: 'India' },

  // Farm details (for farmers)
  landArea: { type: Number },
  soilType: { type: String },
  irrigationType: { type: String },
  experience: { type: String },
  bio: { type: String },
  crops: [{ type: String }],

  // Expert details (for experts)
  qualification: { type: String },
  qualifications: [{
    degree: String,
    university: String,
    year: String
  }],
  specialization: { type: String },
  skillTags: [String],
  institution: { type: String },
  passingYear: { type: String },
  occupation: { type: String },
  idProofType: { type: String },
  idProof: { type: String }, // Will now store image URL instead of number
  docLink: { type: String }, // Highest qualification cert
  secondaryDocLink: { type: String }, // One level below cert
  linkedinUrl: { type: String },
  consultFee: { type: Number },
  languages: { type: String },
  approved: { type: Boolean, default: false },

  // Dashboard & Activity (For real-time populated components)
  stats: {
    detections: { type: Number, default: 0 },
    savings: { type: Number, default: 0 },
    calls: { type: Number, default: 0 },
    cropsTracked: { type: Number, default: 0 }
  },
  recentActivity: [{
    icon: String,
    text: String,
    time: String,
    status: String,
    date: { type: Date, default: Date.now }
  }],
  cropHealthStatus: [{
    crop: String,
    health: Number,
    status: String
  }],
  feedback: [{
    farmerName: String,
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }]
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
