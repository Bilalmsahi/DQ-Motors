from rest_framework import serializers
from .models import BlogPost


class BlogPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'content', 'featured_image',
            'status', 'status_display',
            'meta_title', 'meta_description', 'focus_keywords',
            'author', 'author_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'author', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        if obj.author:
            full = f'{obj.author.first_name} {obj.author.last_name}'.strip()
            return full or obj.author.username
        return None
