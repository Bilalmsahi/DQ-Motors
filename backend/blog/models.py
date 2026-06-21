from django.db import models
from django.conf import settings
from django.utils.text import slugify


class BlogPost(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'

    # Core content
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    content = models.TextField(help_text='Stores HTML content')
    featured_image = models.ImageField(upload_to='blog_images/', blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    # SEO fields
    meta_title = models.CharField(
        max_length=60,
        blank=True,
        help_text='SEO title (max 60 chars)',
    )
    meta_description = models.TextField(
        max_length=160,
        blank=True,
        help_text='SEO description (max 160 chars)',
    )
    focus_keywords = models.CharField(
        max_length=255,
        blank=True,
        help_text='Comma-separated SEO keywords',
    )

    # Metadata
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='blog_posts',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:250]
            slug = base
            n = 1
            while BlogPost.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)
