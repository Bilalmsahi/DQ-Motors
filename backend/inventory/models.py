from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.db.models import Sum
from django.utils import timezone
from PIL import Image as PILImage
from django.core.files.base import ContentFile
import io
import os

# 1. Abstract Base Class for Timestamps
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

# 2. Vehicle Features (e.g., Sunroof, Navigation)
class VehicleFeature(TimeStampedModel):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

# 3. Main Vehicle Model
class Vehicle(TimeStampedModel):
    class Status(models.TextChoices):
        ACQUIRED = 'ACQUIRED', 'Acquired'      # Just bought, not processed (Gray)
        PREP = 'PREP', 'In Prep'               # In reconditioning/repair (Orange)
        READY = 'READY', 'Ready'               # Listed on website, available for sale (Green)
        PENDING = 'PENDING', 'Pending'         # Deposit taken, deal in progress (Yellow)
        SOLD = 'SOLD', 'Sold'                  # Deal finalized (Red)

    class Condition(models.TextChoices):
        NEW = 'NEW', 'New'
        USED = 'USED', 'Used'

    class Transmission(models.TextChoices):
        AUTOMATIC = 'AUTOMATIC', 'Automatic'
        MANUAL = 'MANUAL', 'Manual'
        CVT = 'CVT', 'CVT'
        OTHER = 'OTHER', 'Other'

    class FuelType(models.TextChoices):
        GASOLINE = 'GASOLINE', 'Gasoline'
        DIESEL = 'DIESEL', 'Diesel'
        ELECTRIC = 'ELECTRIC', 'Electric'
        HYBRID = 'HYBRID', 'Hybrid'
        PHEV = 'PHEV', 'Plug-in Hybrid'
        OTHER = 'OTHER', 'Other'

    class BodyStyle(models.TextChoices):
        SEDAN = 'SEDAN', 'Sedan'
        SUV = 'SUV', 'SUV'
        HATCHBACK = 'HATCHBACK', 'Hatchback'
        COUPE = 'COUPE', 'Coupe'
        TRUCK = 'TRUCK', 'Truck'
        MINIVAN = 'MINIVAN', 'Minivan'
        WAGON = 'WAGON', 'Wagon'
        CONVERTIBLE = 'CONVERTIBLE', 'Convertible'
        OTHER = 'OTHER', 'Other'

    class DriveTrain(models.TextChoices):
        FWD = 'FWD', 'Front-Wheel Drive'
        RWD = 'RWD', 'Rear-Wheel Drive'
        AWD = 'AWD', 'All-Wheel Drive'
        FOURWD = '4WD', 'Four-Wheel Drive'

    vin = models.CharField(max_length=17, unique=True, verbose_name="VIN")
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    trim = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    mileage = models.PositiveIntegerField()
    color = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    featured = models.BooleanField(default=False)
    
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.ACQUIRED
    )
    condition = models.CharField(
        max_length=10, 
        choices=Condition.choices, 
        default=Condition.USED
    )

    transmission = models.CharField(
        max_length=20,
        choices=Transmission.choices,
        null=True, blank=True
    )
    fuel_type = models.CharField(
        max_length=20,
        choices=FuelType.choices,
        null=True, blank=True
    )
    body_style = models.CharField(
        max_length=20,
        choices=BodyStyle.choices,
        null=True, blank=True
    )
    drivetrain = models.CharField(
        max_length=10,
        choices=DriveTrain.choices,
        null=True, blank=True
    )
    engine = models.CharField(max_length=100, blank=True, default='')
    doors = models.PositiveIntegerField(null=True, blank=True)
    
    # Sold date - automatically set when status changes to SOLD
    sold_date = models.DateField(null=True, blank=True)
    
    # Final sale price recorded when a deal is accepted
    sold_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Seller field for User Ads
    # If null -> Dealership car (listed by admin)
    # If set -> User Ad (listed by the user)
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vehicles',
        null=True,
        blank=True,
        help_text="If set, this is a user-listed vehicle. If null, it's a dealership car."
    )
    
    # Relationships
    features = models.ManyToManyField(VehicleFeature, blank=True)
    
    # SEO
    slug = models.SlugField(unique=True, blank=True)

    def save(self, *args, **kwargs):
        # Auto-generate slug if it doesn't exist
        if not self.slug:
            # e.g., "toyota-camry-2023-12345"
            base_slug = f"{self.make}-{self.model}-{self.year}-{self.vin[:5]}"
            self.slug = slugify(base_slug)
        
        # Handle sold_date automation
        # If status changed to SOLD, set sold_date if not already set
        if self.status == self.Status.SOLD and not self.sold_date:
            self.sold_date = timezone.now().date()
        # If status changed from SOLD to something else, clear sold_date
        elif self.status != self.Status.SOLD and self.sold_date:
            self.sold_date = None
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.year} {self.make} {self.model} - {self.vin}"
    
    @property
    def total_cost(self):
        """
        Sums up all expenses linked to this vehicle.
        """
        # 'expenses' comes from the related_name in the Expense model
        total = self.expenses.aggregate(sum_amount=Sum('amount'))['sum_amount']
        return total if total else 0

    @property
    def profit_basis_price(self):
        """
        Uses the final sold price once available, otherwise the current listing price.
        """
        return self.sold_price or self.price

    @property
    def profit_margin(self):
        """
        Calculates potential profit: Sale/List Price - Total Cost
        """
        return self.profit_basis_price - (self.total_cost or 0)

# 4. Vehicle Images
class VehicleImage(TimeStampedModel):
    vehicle = models.ForeignKey(
        Vehicle, 
        on_delete=models.CASCADE, 
        related_name='images'
    )
    image = models.ImageField(upload_to='vehicle_images/')

    def save(self, *args, **kwargs):
        # Only process when a new image is being uploaded
        if self.image and hasattr(self.image, 'read'):
            try:
                img = PILImage.open(self.image)

                # Convert RGBA / palette images to RGB for WebP compatibility
                if img.mode in ('RGBA', 'P', 'LA'):
                    background = PILImage.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if 'A' in img.mode else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Resize if wider than 1920px (maintain aspect ratio)
                max_width = 1920
                if img.width > max_width:
                    ratio = max_width / img.width
                    new_height = int(img.height * ratio)
                    img = img.resize((max_width, new_height), PILImage.LANCZOS)

                # Save as WebP into an in-memory buffer
                buffer = io.BytesIO()
                img.save(buffer, format='WEBP', quality=80, method=4)
                buffer.seek(0)

                # Replace the file on the field with the WebP version
                original_name = os.path.splitext(os.path.basename(self.image.name))[0]
                self.image = ContentFile(buffer.read(), name=f'{original_name}.webp')
            except Exception:
                # If compression fails for any reason, save the original image
                pass

        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Image for {self.vehicle.vin}"


# 5. Vehicle Videos
class VehicleVideo(TimeStampedModel):
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='videos'
    )
    video = models.FileField(upload_to='vehicle_videos/')
    title = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Video for {self.vehicle.vin}"


# 6. Favorite / Wishlist Model
class Favorite(TimeStampedModel):
    """
    Tracks vehicles that users have 'liked' or added to their wishlist.
    A user can only like a vehicle once (enforced by unique_together).
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorites'
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    
    class Meta:
        unique_together = ('user', 'vehicle')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} likes {self.vehicle}"


# 6. Vehicle Document Model
def document_upload_path(instance, filename):
    """Generate upload path: vehicle_docs/vehicle_<id>/<filename>"""
    return f"vehicle_docs/vehicle_{instance.vehicle_id}/{filename}"


class VehicleDocument(TimeStampedModel):
    """
    Centralized document storage for vehicles.
    Supports visibility control - documents can be public or internal only.
    """
    class DocType(models.TextChoices):
        INSPECTION = 'INSPECTION', 'Inspection Report'
        SERVICE_RECORD = 'SERVICE_RECORD', 'Service Record'
        OWNERSHIP = 'OWNERSHIP', 'Ownership / Title'
        WARRANTY = 'WARRANTY', 'Warranty Document'
        CARFAX = 'CARFAX', 'Carfax / Vehicle History'
        OTHER = 'OTHER', 'Other'

    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    title = models.CharField(
        max_length=200,
        help_text="Document title (e.g., 'Dyno Test Result')"
    )
    file = models.FileField(
        upload_to=document_upload_path,
        help_text="Upload PDF, images, or other documents"
    )
    doc_type = models.CharField(
        max_length=20,
        choices=DocType.choices,
        default=DocType.OTHER
    )
    is_public = models.BooleanField(
        default=False,
        help_text="If True, this document is visible to public customers. If False, only admins can see it."
    )
    description = models.TextField(
        blank=True,
        help_text="Optional notes about this document"
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        visibility = "Public" if self.is_public else "Internal"
        return f"{self.title} ({visibility}) - {self.vehicle.vin}"
    
    @property
    def file_url(self):
        """Return the file URL"""
        if self.file:
            return self.file.url
        return None
    
    @property
    def file_name(self):
        """Return just the filename"""
        if self.file:
            return self.file.name.split('/')[-1]
        return None
