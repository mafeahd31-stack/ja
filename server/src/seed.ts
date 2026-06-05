import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jaykom';

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;

  // Clear existing data
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
  console.log('Cleared existing data');

  // ── Restaurants ──
  const restaurantOwnerId = new mongoose.Types.ObjectId();
  const restaurantId1 = new mongoose.Types.ObjectId();
  const restaurantId2 = new mongoose.Types.ObjectId();
  const restaurantId3 = new mongoose.Types.ObjectId();

  const restaurants = [
    {
      _id: restaurantId1,
      ownerId: restaurantOwnerId,
      name: 'Al-Sham Grill',
      nameAr: 'الشام جريل',
      description: 'Authentic Syrian grilled meats and traditional dishes',
      descriptionAr: 'مشاوي سورية أصيلة وأطباق تقليدية',
      cuisine: ['Syrian', 'Grill', 'Arabic'],
      phone: '+963 11 234 5678',
      imageUrl: 'https://placehold.co/400x300/00843D/FFFFFF?text=الشام+جريل',
      coverUrl: 'https://placehold.co/800x300/00843D/FFFFFF?text=الشام+جريل',
      rating: 4.7,
      ratingCount: 342,
      deliveryFee: 3000,
      minOrder: 15000,
      estimatedTime: '30-45',
      latitude: 33.5138,
      longitude: 36.2765,
      isOpen: true,
      isFeatured: true,
      workingHours: [
        { day: 'Saturday', open: '09:00', close: '23:00' },
        { day: 'Sunday', open: '09:00', close: '23:00' },
        { day: 'Monday', open: '09:00', close: '23:00' },
        { day: 'Tuesday', open: '09:00', close: '23:00' },
        { day: 'Wednesday', open: '09:00', close: '23:00' },
        { day: 'Thursday', open: '09:00', close: '00:00' },
        { day: 'Friday', open: '12:00', close: '00:00' },
      ],
      categories: [
        {
          name: 'Main Dishes',
          nameAr: 'الأطباق الرئيسية',
          items: [
            {
              name: 'Mixed Grill Plate',
              nameAr: 'صينية مشاوي مشكلة',
              description: 'Mix of shish tawook, kebab, and lamb chops with rice',
              descriptionAr: 'مزيج من شيش طاووق وكباب وريش غنم مع رز',
              price: 35000,
              imageUrl: 'https://placehold.co/200x200/00843D/FFFFFF?text=مشاوي',
              category: 'Main Dishes',
              isAvailable: true,
              extras: [
                { name: 'Extra Rice', nameAr: 'رز إضافي', price: 3000 },
                { name: 'Extra Salad', nameAr: 'سلطة إضافية', price: 2500 },
              ],
            },
            {
              name: 'Shish Tawook',
              nameAr: 'شيش طاووق',
              description: 'Marinated chicken skewers with garlic sauce',
              descriptionAr: 'أسياخ دجاج متبلة مع ثومية',
              price: 22000,
              category: 'Main Dishes',
              isAvailable: true,
              extras: [],
            },
            {
              name: 'Lamb Kebab',
              nameAr: 'كباب',
              description: 'Grilled minced lamb with spices',
              descriptionAr: 'لحم مفروم مشوي مع بهارات',
              price: 25000,
              category: 'Main Dishes',
              isAvailable: true,
              extras: [],
            },
            {
              name: 'Fatteh',
              nameAr: 'فتة',
              description: 'Layered bread, rice, chickpeas with yogurt and pine nuts',
              descriptionAr: 'خبز ورز وحمص مع لبن وصنوبر',
              price: 12000,
              category: 'Appetizers',
              isAvailable: true,
              extras: [],
            },
            {
              name: 'Hummus',
              nameAr: 'حمص',
              description: 'Creamy chickpea dip with tahini',
              descriptionAr: 'حمص بالطحينة',
              price: 8000,
              category: 'Appetizers',
              isAvailable: true,
              extras: [],
            },
          ],
        },
      ],
      paymentMethods: ['cash', 'sham_cash'],
    },
    {
      _id: restaurantId2,
      ownerId: restaurantOwnerId,
      name: 'Damascus Sweets',
      nameAr: 'حلويات دمشق',
      description: 'Traditional Syrian pastries and desserts',
      descriptionAr: 'حلويات شرقية سورية تقليدية',
      cuisine: ['Syrian', 'Desserts'],
      phone: '+963 11 345 6789',
      imageUrl: 'https://placehold.co/400x300/D4AF37/000000?text=حلويات+دمشق',
      coverUrl: 'https://placehold.co/800x300/D4AF37/000000?text=حلويات+دمشق',
      rating: 4.8,
      ratingCount: 521,
      deliveryFee: 2000,
      minOrder: 10000,
      estimatedTime: '20-35',
      latitude: 33.515,
      longitude: 36.28,
      isOpen: true,
      isFeatured: true,
      workingHours: [
        { day: 'Saturday', open: '08:00', close: '22:00' },
        { day: 'Sunday', open: '08:00', close: '22:00' },
        { day: 'Monday', open: '08:00', close: '22:00' },
        { day: 'Tuesday', open: '08:00', close: '22:00' },
        { day: 'Wednesday', open: '08:00', close: '22:00' },
        { day: 'Thursday', open: '08:00', close: '23:00' },
        { day: 'Friday', open: '10:00', close: '23:00' },
      ],
      categories: [
        {
          name: 'Pastries',
          nameAr: 'المعجنات',
          items: [
            {
              name: 'Kunafa with Cheese',
              nameAr: 'كنافة بالجبنة',
              description: 'Shredded phyllo pastry with sweet cheese and syrup',
              descriptionAr: 'عجينة كنافة مع جبنة حلوة وقطر',
              price: 15000,
              category: 'Pastries',
              isAvailable: true,
              extras: [
                { name: 'Extra Cheese', nameAr: 'جبنة إضافية', price: 3000 },
                { name: 'With Ice Cream', nameAr: 'مع بوظة', price: 5000 },
              ],
            },
            {
              name: 'Baklava Mix',
              nameAr: 'بقلاوة مشكلة',
              description: 'Assorted pistachio and walnut baklava',
              descriptionAr: 'بقلاوة مشكلة بالفستق والجوز',
              price: 20000,
              category: 'Pastries',
              isAvailable: true,
              extras: [],
            },
            {
              name: 'Halawet el Jibn',
              nameAr: 'حلاوة الجبن',
              description: 'Sweet cheese pastry with cream and pistachio',
              descriptionAr: 'حلاوة جبن مع قشطة وفستق',
              price: 12000,
              category: 'Pastries',
              isAvailable: true,
              extras: [],
            },
          ],
        },
      ],
      paymentMethods: ['cash', 'sham_cash'],
    },
    {
      _id: restaurantId3,
      ownerId: restaurantOwnerId,
      name: 'Aleppo Kitchen',
      nameAr: 'مطبخ حلب',
      description: 'Authentic Aleppian cuisine from the culinary capital of Syria',
      descriptionAr: 'مطبخ حلبي أصيل من عاصمة المطبخ السوري',
      cuisine: ['Syrian', 'Aleppian'],
      phone: '+963 11 456 7890',
      imageUrl: 'https://placehold.co/400x300/CE1126/FFFFFF?text=مطبخ+حلب',
      coverUrl: 'https://placehold.co/800x300/CE1126/FFFFFF?text=مطبخ+حلب',
      rating: 4.6,
      ratingCount: 287,
      deliveryFee: 3500,
      minOrder: 20000,
      estimatedTime: '35-50',
      latitude: 33.51,
      longitude: 36.27,
      isOpen: true,
      isFeatured: false,
      workingHours: [
        { day: 'Saturday', open: '10:00', close: '22:00' },
        { day: 'Sunday', open: '10:00', close: '22:00' },
        { day: 'Monday', open: '10:00', close: '22:00' },
        { day: 'Tuesday', open: '10:00', close: '22:00' },
        { day: 'Wednesday', open: '10:00', close: '22:00' },
        { day: 'Thursday', open: '10:00', close: '23:00' },
        { day: 'Friday', open: '12:00', close: '23:00' },
      ],
      categories: [
        {
          name: 'Specialties',
          nameAr: 'الأطباق الحلبية',
          items: [
            {
              name: 'Kibbeh Halab',
              nameAr: 'كبة حلب',
              description: 'Aleppian-style kibbeh with cherries and pomegranate',
              descriptionAr: 'كبة على الطريقة الحلبية مع كرز ورمان',
              price: 18000,
              category: 'Specialties',
              isAvailable: true,
              extras: [],
            },
            {
              name: 'Fattet Makdous',
              nameAr: 'فتة مكدوس',
              description: 'Stuffed eggplants with meat and yogurt',
              descriptionAr: 'باذنجان محشي باللحم واللبن',
              price: 22000,
              category: 'Specialties',
              isAvailable: true,
              extras: [],
            },
          ],
        },
      ],
      paymentMethods: ['cash', 'sham_cash'],
    },
  ];

  await db.collection('restaurants').insertMany(restaurants);
  console.log(`Seeded ${restaurants.length} restaurants`);

  // ── Coupons ──
  const coupons = [
    {
      code: 'WELCOME10',
      description: '10% off your first order',
      descriptionAr: 'خصم 10% على أول طلب',
      discountType: 'percentage',
      discountValue: 10,
      minOrder: 15000,
      maxDiscount: 10000,
      maxUses: 1000,
      usedCount: 0,
      usedBy: [],
      isActive: true,
      expiresAt: new Date('2027-12-31'),
    },
    {
      code: 'FREEDELIVERY',
      description: 'Free delivery on your order',
      descriptionAr: 'توصيل مجاني على طلبك',
      discountType: 'fixed',
      discountValue: 5000,
      minOrder: 20000,
      maxUses: 500,
      usedCount: 0,
      usedBy: [],
      isActive: true,
      expiresAt: new Date('2027-12-31'),
    },
    {
      code: 'SAVE25',
      description: '25% off on orders above 50000 SYP',
      descriptionAr: 'خصم 25% على الطلبات فوق 50000 ل.س',
      discountType: 'percentage',
      discountValue: 25,
      minOrder: 50000,
      maxDiscount: 25000,
      maxUses: 200,
      usedCount: 0,
      usedBy: [],
      isActive: true,
      expiresAt: new Date('2026-12-31'),
    },
  ];

  await db.collection('coupons').insertMany(coupons);
  console.log(`Seeded ${coupons.length} coupons`);

  // ── Captains ──
  const hashedPassword = await bcrypt.hash('123456', 10);

  const captains = [
    {
      phone: '+963 94 111 1111',
      name: 'Ahmed Ali',
      avatar: 'https://placehold.co/200x200/00843D/FFFFFF?text=A',
      password: hashedPassword,
      rating: 4.9,
      ratingCount: 156,
      isOnline: true,
      isActive: true,
      vehicleType: 'motorcycle',
      vehiclePlate: 'د-12345',
      currentLocation: {
        type: 'Point',
        coordinates: [36.2765, 33.5138],
      },
      completedOrders: 1240,
      totalEarnings: 2850000,
      todayEarnings: 45000,
      todayDeliveries: 8,
      isVerified: true,
    },
    {
      phone: '+963 94 222 2222',
      name: 'Mahmoud Hassan',
      avatar: 'https://placehold.co/200x200/D4AF37/000000?text=M',
      password: hashedPassword,
      rating: 4.7,
      ratingCount: 98,
      isOnline: true,
      isActive: true,
      vehicleType: 'car',
      vehiclePlate: 'ب-67890',
      currentLocation: {
        type: 'Point',
        coordinates: [36.28, 33.515],
      },
      completedOrders: 876,
      totalEarnings: 1950000,
      todayEarnings: 32000,
      todayDeliveries: 5,
      isVerified: true,
    },
  ];

  await db.collection('captains').insertMany(captains);
  console.log(`Seeded ${captains.length} captains`);

  // ── Sample Orders ──
  const userId = new mongoose.Types.ObjectId();

  const orders = [
    {
      userId,
      restaurantId: restaurantId1,
      items: [
        {
          menuItemId: new mongoose.Types.ObjectId(),
          name: 'Mixed Grill Plate',
          nameAr: 'صينية مشاوي مشكلة',
          quantity: 1,
          price: 35000,
          selectedExtras: [{ name: 'Extra Rice', nameAr: 'رز إضافي', price: 3000 }],
        },
        {
          menuItemId: new mongoose.Types.ObjectId(),
          name: 'Hummus',
          nameAr: 'حمص',
          quantity: 1,
          price: 8000,
          selectedExtras: [],
        },
      ],
      subtotal: 46000,
      deliveryFee: 3000,
      discount: 0,
      total: 49000,
      status: 'delivered',
      paymentMethod: 'cash',
      isPaid: true,
      deliveryAddress: {
        label: 'Home',
        fullAddress: 'Damascus, Al-Mazzah, Baghdad Street, Building 5',
        latitude: 33.51,
        longitude: 36.27,
      },
      deliveredAt: new Date(Date.now() - 86400000),
      createdAt: new Date(Date.now() - 86400000 * 2),
    },
    {
      userId,
      restaurantId: restaurantId2,
      items: [
        {
          menuItemId: new mongoose.Types.ObjectId(),
          name: 'Kunafa with Cheese',
          nameAr: 'كنافة بالجبنة',
          quantity: 2,
          price: 15000,
          selectedExtras: [],
        },
      ],
      subtotal: 30000,
      deliveryFee: 2000,
      discount: 0,
      total: 32000,
      status: 'on_the_way',
      paymentMethod: 'sham_cash',
      isPaid: true,
      deliveryAddress: {
        label: 'Work',
        fullAddress: 'Damascus, Al-Mazzah, Abu Rummaneh',
        latitude: 33.52,
        longitude: 36.28,
      },
      estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000),
      createdAt: new Date(Date.now() - 3600000),
    },
  ];

  await db.collection('orders').insertMany(orders);
  console.log(`Seeded ${orders.length} orders`);

  console.log('\n✅ Seed completed successfully!');
  console.log('\nTest Captain Login:');
  console.log('  Phone: +963 94 111 1111');
  console.log('  Password: 123456');
  console.log('\nTest OTP: 1234 (development mode)');

  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
