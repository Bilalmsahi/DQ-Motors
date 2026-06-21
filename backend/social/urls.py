from django.urls import path
from .views import (
    FacebookConnectView,
    SaveFacebookPageView,
    SocialCredentialListView,
    SocialCredentialDisconnectView,
    PostToFacebookView,
    GenerateReelCaptionView,
    PostReelView,
)

urlpatterns = [
    # Facebook OAuth handshake
    path('facebook/connect/', FacebookConnectView.as_view(), name='facebook-connect'),
    path('facebook/save-page/', SaveFacebookPageView.as_view(), name='facebook-save-page'),

    # Connected credentials management
    path('credentials/', SocialCredentialListView.as_view(), name='social-credentials'),
    path('credentials/<int:pk>/', SocialCredentialDisconnectView.as_view(), name='social-credential-disconnect'),

    # Publishing
    path('post-now/', PostToFacebookView.as_view(), name='social-post-now'),
    path('post-reel/', PostReelView.as_view(), name='social-post-reel'),

    # AI caption generation
    path('generate-reel-caption/', GenerateReelCaptionView.as_view(), name='generate-reel-caption'),
]
